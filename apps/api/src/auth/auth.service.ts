import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { WorkspaceRole } from '../generated/prisma/client.js';
import { userBriefSelect } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto, RefreshDto, RegisterDto } from './dto/index.js';

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
      where: { email: loginDto.email.toLowerCase() },
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
    const email = registerDto.email.toLowerCase();
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

    return {
      ...this.toSafeUser(user),
      message:
        'Account created. Ask a workspace admin to invite you before using tasks.',
    };
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
