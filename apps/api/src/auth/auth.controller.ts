import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AuthService,
  AuthTokens,
  ForgotPasswordResult,
  MeResult,
  RegisterResult,
  ResetPasswordResult,
} from './auth.service.js';
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

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Sign in with email and password' })
  login(@Body() loginDto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(loginDto);
  }

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  @ApiOperation({ summary: 'Create account (optionally accept workspace invite)' })
  register(@Body() registerDto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(registerDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() refreshDto: RefreshDto): Promise<AuthTokens> {
    return this.authService.refresh(refreshDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResult> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
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
