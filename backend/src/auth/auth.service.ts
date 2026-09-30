import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto, VerifyOtpDto, ResendOtpDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { OtpPurpose } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpSalt: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.otpSalt = this.configService.get<string>('OTP_SECRET_SALT', 'chitro-otp-digest-salt-2026');
  }

  private hashOtp(code: string): string {
    return crypto.createHash('sha256').update(`${code}:${this.otpSalt}`).digest('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generate6DigitOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();

    // Check if verified user exists
    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail && existingEmail.isVerified) {
      throw new BadRequestException('An account with this email address already exists');
    }

    const existingUsername = await this.prisma.user.findUnique({ where: { username } });
    if (existingUsername && existingUsername.isVerified && existingUsername.id !== existingEmail?.id) {
      throw new BadRequestException('This username is already taken. Please choose another');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let user;
    if (existingEmail && !existingEmail.isVerified) {
      // Update pending registration
      user = await this.prisma.user.update({
        where: { id: existingEmail.id },
        data: {
          username,
          displayName: dto.displayName.trim(),
          passwordHash,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          username,
          displayName: dto.displayName.trim(),
          passwordHash,
          isVerified: false,
        },
      });
    }

    // Invalidate existing active registration OTPs for this email
    await this.prisma.otpChallenge.updateMany({
      where: { email, purpose: OtpPurpose.REGISTER, isUsed: false },
      data: { isUsed: true },
    });

    // Generate fresh 6-digit OTP
    const code = this.generate6DigitOtp();
    const codeHash = this.hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.otpChallenge.create({
      data: {
        email,
        codeHash,
        purpose: OtpPurpose.REGISTER,
        expiresAt,
        attempts: 0,
        isUsed: false,
      },
    });

    // Send email via Nodemailer template
    await this.mailService.sendVerificationCode(email, user.displayName, code);

    return {
      success: true,
      message: 'Verification code sent to your email',
      email,
      expiresInMinutes: 10,
    };
  }

  async verifyOtp(dto: VerifyOtpDto, reqMeta?: { userAgent?: string; ip?: string }) {
    const email = dto.email.trim().toLowerCase();
    const code = dto.code.trim();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('No account found for this email address');
    }

    // Find latest unused registration challenge
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose: OtpPurpose.REGISTER, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException('No active verification request found. Please request a new code.');
    }

    // Check expiration
    if (new Date() > challenge.expiresAt) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    // Check attempts limit (max 5)
    if (challenge.attempts >= 5) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Validate hash
    const inputHash = this.hashOtp(code);
    if (inputHash !== challenge.codeHash) {
      const remaining = 4 - challenge.attempts;
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });

      if (remaining <= 0) {
        await this.prisma.otpChallenge.update({
          where: { id: challenge.id },
          data: { isUsed: true },
        });
        throw new BadRequestException('Invalid code. Maximum attempts reached. Please request a new code.');
      }

      throw new BadRequestException(`Invalid verification code. ${remaining} attempt(s) remaining.`);
    }

    // Mark challenge as used and user as verified
    await this.prisma.$transaction([
      this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
    ]);

    // Issue tokens and session
    const tokens = await this.createSession(user.id, user.email, user.username, reqMeta);

    return {
      success: true,
      message: 'Account verified successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isVerified: true,
      },
      ...tokens,
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('No account found for this email address');
    }

    if (user.isVerified) {
      throw new BadRequestException('This account is already verified. Please sign in.');
    }

    // Check 60-second cooldown
    const latestChallenge = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose: OtpPurpose.REGISTER },
      orderBy: { createdAt: 'desc' },
    });

    if (latestChallenge) {
      const diffSecs = (Date.now() - latestChallenge.createdAt.getTime()) / 1000;
      if (diffSecs < 60) {
        const remaining = Math.ceil(60 - diffSecs);
        throw new BadRequestException(`Please wait ${remaining} seconds before requesting a new code.`);
      }
    }

    // Invalidate existing challenges
    await this.prisma.otpChallenge.updateMany({
      where: { email, purpose: OtpPurpose.REGISTER, isUsed: false },
      data: { isUsed: true },
    });

    const code = this.generate6DigitOtp();
    const codeHash = this.hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpChallenge.create({
      data: {
        email,
        codeHash,
        purpose: OtpPurpose.REGISTER,
        expiresAt,
        attempts: 0,
        isUsed: false,
      },
    });

    await this.mailService.sendVerificationCode(email, user.displayName, code);

    return {
      success: true,
      message: 'A new verification code has been sent to your email',
      expiresInMinutes: 10,
    };
  }

  getDevMailbox(email: string) {
    return this.mailService.getLatestDevOtp(email);
  }

  async login(dto: LoginDto, reqMeta?: { userAgent?: string; ip?: string }) {
    const identifier = dto.identifier.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    if (!user.isVerified) {
      return {
        isVerified: false,
        email: user.email,
        message: 'Your account is not verified yet. Please enter the verification code sent to your email.',
      };
    }

    const tokens = await this.createSession(user.id, user.email, user.username, reqMeta);

    return {
      isVerified: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isVerified: true,
      },
      ...tokens,
    };
  }

  async refreshTokens(dto: RefreshTokenDto, reqMeta?: { userAgent?: string; ip?: string }) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old session and issue new tokens (rotation)
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.createSession(session.user.id, session.user.email, session.user.username, reqMeta);
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return { success: true };
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  private async createSession(
    userId: string,
    email: string,
    username: string,
    reqMeta?: { userAgent?: string; ip?: string },
  ) {
    const payload = { sub: userId, email, username };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'chitro-super-secret-access-token-key-2026'),
      expiresIn: '15m',
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: reqMeta?.userAgent,
        ip: reqMeta?.ip,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }
}
