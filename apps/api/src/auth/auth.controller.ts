import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthService,
  AuthTokens,
  MeResult,
  RegisterResult,
} from './auth.service.js';
import { AuthUser, CurrentUser } from './current-user.decorator.js';
import { LoginDto, RefreshDto, RegisterDto } from './dto/index.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(loginDto);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() refreshDto: RefreshDto): Promise<AuthTokens> {
    return this.authService.refresh(refreshDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<MeResult> {
    return this.authService.me(user.userId);
  }
}
