import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { InvitesModule } from '../invites/invites.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JWT_SECRET } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { PasswordResetService } from './password-reset.service.js';

@Module({
  imports: [
    PrismaModule,
    InvitesModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    PasswordResetService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
