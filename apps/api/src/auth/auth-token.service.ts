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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || payload.ver !== user.tokenVersion) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.signTokens(user.id, user.tokenVersion);
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
