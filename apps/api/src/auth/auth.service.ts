import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from 'argon2';
import { WorkspaceRole } from '../generated/prisma/client.js';
import { userBriefSelect, normalizeEmail } from '../common/index.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WorkspaceInvitesService } from '../invites/workspace-invites.service.js';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/index.js';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

type SafeUser = {
  id: string;
  email: string;
  name: string | null;
};

export type RegisterResult = SafeUser & {
  message: string;
};

export type ForgotPasswordResult = {
  message: string;
  /** Dev-only: raw token when email delivery is not configured. */
  resetToken?: string;
};

export type ResetPasswordResult = {
  message: string;
};

export type MeWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
};

export type MeResult = SafeUser & {
  workspaces: MeWorkspace[];
};

type TokenPayload = {
  sub: string;
  typ: 'access' | 'refresh';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mail: MailService,
    private readonly workspaceInvites: WorkspaceInvitesService,
  ) {}

  async me(userId: string): Promise<MeResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userBriefSelect,
        workspaceMemberships: {
          include: {
            workspace: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { workspace: { createdAt: 'desc' } },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      workspaces: user.workspaceMemberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
      })),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(loginDto.email) },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.verifyPassword(
      user.passwordHash,
      loginDto.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signTokens(user.id);
  }

  async register(registerDto: RegisterDto): Promise<RegisterResult> {
    const email = normalizeEmail(registerDto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hash(registerDto.password),
        name: registerDto.name,
      },
    });

    if (registerDto.inviteToken) {
      await this.workspaceInvites.acceptInviteToken(
        registerDto.inviteToken,
        user.id,
      );
      return {
        ...this.toSafeUser(user),
        message: 'Account created and workspace invite accepted.',
      };
    }

    const acceptedInvites =
      await this.workspaceInvites.acceptPendingInvitesForEmail(
        user.id,
        email,
      );

    if (acceptedInvites > 0) {
      return {
        ...this.toSafeUser(user),
        message:
          acceptedInvites === 1
            ? 'Account created and workspace invite accepted.'
            : `Account created and ${acceptedInvites} workspace invites accepted.`,
      };
    }

    return {
      ...this.toSafeUser(user),
      message:
        'Account created. Ask a workspace admin to invite you before using tasks.',
    };
  }

  async acceptInvite(userId: string, token: string): Promise<MeResult> {
    await this.workspaceInvites.acceptInviteToken(token, userId);
    return this.me(userId);
  }

  async updateProfile(
    userId: string,
    name: string,
  ): Promise<MeResult> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Name cannot be empty');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { name: trimmed },
    });

    return this.me(userId);
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResult> {
    const message =
      'If an account exists for this email, a reset link has been sent.';

    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });

    if (!user) {
      return { message };
    }

    const rawToken = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = this.mail.appUrl(`/reset-password?token=${rawToken}`);
    const sent = await this.mail.send({
      to: user.email,
      subject: 'Reset your ApproveFlow password',
      text: `Use this link to reset your password (valid for 1 hour):\n${resetUrl}`,
    });

    if (!sent || process.env.NODE_ENV !== 'production') {
      return { message, resetToken: rawToken };
    }

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResult> {
    const tokenHash = this.hashResetToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await hash(dto.password) },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId },
      }),
    ]);

    return { message: 'Password updated. You can sign in now.' };
  }

  async refresh(refreshDto: RefreshDto): Promise<AuthTokens> {
    let payload: TokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshDto.refresh_token,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.signTokens(user.id);
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async verifyPassword(
    passwordHash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  private async signTokens(userId: string): Promise<AuthTokens> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync({ sub: userId, typ: 'access' } satisfies TokenPayload),
      this.jwtService.signAsync(
        { sub: userId, typ: 'refresh' } satisfies TokenPayload,
        { expiresIn: '7d' },
      ),
    ]);

    return { access_token, refresh_token };
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    name: string | null;
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
