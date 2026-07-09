import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { hash } from 'argon2';
import { ENV } from '../config/env.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ForgotPasswordResult,
  ResetPasswordResult,
} from './auth.service.js';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async forgotPassword(
    userEmail: string,
    normalizedEmail: string,
  ): Promise<ForgotPasswordResult> {
    const message = 'If an account exists for this email, a reset link has been sent.';
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
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
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = this.mail.appUrl(`/reset-password?token=${rawToken}`);
    const sent = await this.mail.send({
      to: userEmail,
      subject: 'Reset your ApproveFlow password',
      text: `Use this link to reset your password (valid for 1 hour):\n${resetUrl}`,
    });

    if (
      !sent ||
      ENV.NODE_ENV === 'test' ||
      (ENV.EXPOSE_DEBUG_TOKENS && ENV.NODE_ENV !== 'production')
    ) {
      return { message, resetToken: rawToken };
    }

    return { message };
  }

  async resetPassword(token: string, password: string): Promise<ResetPasswordResult> {
    const tokenHash = this.hashResetToken(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await hash(password),
          tokenVersion: { increment: 1 },
        },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId },
      }),
    ]);

    return { message: 'Password updated. You can sign in now.' };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
