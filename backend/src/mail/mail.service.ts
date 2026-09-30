import { Injectable, Logger, BadGatewayException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { getChitroVerificationTemplate } from './templates/chitro-verification.template';

export interface DevMailboxEntry {
  email: string;
  code: string;
  expiresAt: string;
  createdAt: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private readonly fromAddress: string;
  private readonly isProduction: boolean;
  private readonly devMailbox = new Map<string, DevMailboxEntry>();
  private readonly mailboxDir: string;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.mailboxDir = path.join(process.cwd(), '.mailbox');

    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 465));
    const secure = this.configService.get<string>('SMTP_SECURE', 'true') === 'true';
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');

    this.fromAddress =
      this.configService.get<string>('EMAIL_FROM') ||
      'Chitro Security <no-reply@chitro.app>';

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`Nodemailer transport created for host: ${host} (Account: ${this.maskEmail(user)})`);
      this.verifyTransporter();
    } else {
      this.logger.warn('SMTP credentials not provided. Operating in development sandbox mode.');
    }
  }

  async verifyTransporter(): Promise<boolean> {
    if (!this.transporter) {
      this.isConfigured = false;
      return false;
    }
    try {
      await this.transporter.verify();
      this.isConfigured = true;
      this.logger.log('SMTP connection verified successfully with mail server');
      return true;
    } catch (err: any) {
      this.isConfigured = false;
      this.logger.warn(
        `SMTP server verification failed (${err.message}). ${
          this.isProduction ? 'Production mail delivery disabled.' : 'Operating in development sandbox mode.'
        }`,
      );
      return false;
    }
  }

  async sendVerificationCode(to: string, displayName: string, code: string): Promise<boolean> {
    const { subject, html, text } = getChitroVerificationTemplate({
      name: displayName,
      otp: code,
      expiryMinutes: 10,
    });

    // Record in development sandbox for local test suites (never in production)
    if (!this.isProduction) {
      this.recordDevMailbox(to, code);
    }

    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject,
          text,
          html,
        });
        this.logger.log(`Verification email sent to recipient ${this.maskEmail(to)} (MessageId: ${info.messageId})`);
        return true;
      } catch (error: any) {
        this.logger.error(`SMTP delivery failed for ${this.maskEmail(to)}: ${error.message}`);
        throw new BadGatewayException(
          `Email delivery failed (${error.message}). Please check SMTP configuration or email address.`,
        );
      }
    } else {
      if (this.isProduction) {
        throw new BadGatewayException('Email service is not configured.');
      }
      this.logger.log(`[DEV MODE] Verification challenge recorded in local sandbox for ${this.maskEmail(to)}`);
      return true;
    }
  }

  private recordDevMailbox(email: string, code: string) {
    const entry: DevMailboxEntry = {
      email,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.devMailbox.set(email.toLowerCase(), entry);

    try {
      if (!fs.existsSync(this.mailboxDir)) {
        fs.mkdirSync(this.mailboxDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(this.mailboxDir, 'latest-otp.json'),
        JSON.stringify(entry, null, 2),
        'utf8',
      );
    } catch (e: any) {
      // Ignore file write errors in dev
    }
  }

  getLatestDevOtp(email: string): DevMailboxEntry | null {
    if (this.isProduction) {
      throw new NotFoundException('Development sandbox is not available in production');
    }
    return this.devMailbox.get(email.toLowerCase()) || null;
  }

  private maskEmail(email: string): string {
    if (!email) return '***';
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}@${domain}`;
  }
}
