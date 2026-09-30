import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, VerifyOtpDto, ResendOtpDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthRateLimitGuard } from './guards/rate-limit.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.connection?.remoteAddress;
    return this.authService.verifyOtp(dto, { userAgent, ip });
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.connection?.remoteAddress;
    return this.authService.login(dto, { userAgent, ip });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.connection?.remoteAddress;
    return this.authService.refreshTokens(dto, { userAgent, ip });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return {
      success: true,
      user,
    };
  }

  @Get('dev-mailbox')
  async devMailbox(@Req() req: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('Dev mailbox is disabled in production mode');
    }
    const email = req.query.email;
    if (!email) return { success: false, message: 'Email required' };
    return {
      success: true,
      data: this.authService.getDevMailbox(String(email)),
    };
  }
}
