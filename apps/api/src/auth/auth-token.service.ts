import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthTokens } from './auth.service.js';

type TokenPayload = {
  sub: string;
  typ: 'access' | 'refresh';
  ver: number;
};

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate: bump tokenVersion atomically. Reuse of an old refresh token fails.
    const updated = await this.prisma.user.updateMany({
      where: { id: payload.sub, tokenVersion: payload.ver },
      data: { tokenVersion: { increment: 1 } },
    });
    if (updated.count === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.signTokens(payload.sub, payload.ver + 1);
  }

  async signTokens(userId: string, tokenVersion: number): Promise<AuthTokens> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync({
        sub: userId,
        typ: 'access',
        ver: tokenVersion,
      } satisfies TokenPayload),
      this.jwtService.signAsync(
        { sub: userId, typ: 'refresh', ver: tokenVersion } satisfies TokenPayload,
        { expiresIn: '7d' },
      ),
    ]);

    return { access_token, refresh_token };
  }

  async revokeUserTokens(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }
}
