import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 30, { message: 'Username must be between 3 and 30 characters' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, { message: 'Username can only contain alphanumeric characters, underscores, dots, or dashes' })
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50, { message: 'Display name must be between 2 and 50 characters' })
  displayName: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 100, { message: 'Password must be at least 8 characters long' })
  password: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  code: string;
}

export class ResendOtpDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required' })
  identifier: string; // can be email or username

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
