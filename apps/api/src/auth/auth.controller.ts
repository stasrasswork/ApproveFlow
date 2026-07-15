import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  AuthService,
  AuthTokens,
  ForgotPasswordResult,
  MeResult,
  RegisterResult,
  ResetPasswordResult,
} from './auth.service.js';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './auth-cookies.js';
import { AuthUser, CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import {
  AcceptInviteDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/index.js';

export type AuthSessionResult = { ok: true } | AuthTokens;

@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Sign in with email and password',
    description:
      'Sets HttpOnly cookies. Does not return tokens in the JSON body (browser-safe).',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResult> {
    const tokens = await this.authService.login(loginDto);
    setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  @ApiOperation({ summary: 'Create account (optionally accept workspace invite)' })
  register(@Body() registerDto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Cookie sessions get new cookies and `{ ok: true }`. Passing `refresh_token` in the body returns new tokens for API clients.',
  })
  async refresh(
    @Body() refreshDto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResult> {
    const fromBody = Boolean(refreshDto.refresh_token?.trim());
    const refreshToken =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ??
      refreshDto.refresh_token;
    const tokens = await this.authService.refresh(refreshToken);
    setAuthCookies(res, tokens);
    return fromBody ? tokens : { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResult> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Set new password with reset token' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<ResetPasswordResult> {
    return this.authService.resetPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('accept-invite')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept workspace invite (authenticated user)' })
  acceptInvite(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptInviteDto,
  ): Promise<MeResult> {
    return this.authService.acceptInvite(user.userId, dto.token);
  }

  @SkipThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current session tokens' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(user.userId);
    clearAuthCookies(res);
  }

  @SkipThrottle()
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile and workspaces' })
  me(@CurrentUser() user: AuthUser): Promise<MeResult> {
    return this.authService.me(user.userId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user display name' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<MeResult> {
    return this.authService.updateProfile(user.userId, dto.name);
  }
}
