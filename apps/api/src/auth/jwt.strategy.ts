import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { ACCESS_COOKIE } from './auth-cookies.js';
import { JWT_SECRET } from './auth.constants.js';

type JwtPayload = {
  sub: string;
  typ?: 'access' | 'refresh';
  ver?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies?.[ACCESS_COOKIE] as string | undefined) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<{ userId: string }> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    if (payload.typ && payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tokenVersion: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if (payload.ver === undefined || payload.ver !== user.tokenVersion) {
      throw new UnauthorizedException('Invalid token');
    }

    return { userId: payload.sub };
  }
}
