import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface RequestRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AuthRateLimitGuard.name);
  private readonly requests = new Map<string, RequestRecord>();

  // Limits: 15 requests per 1-minute window per IP per route
  private readonly limit = 15;
  private readonly windowMs = 60 * 1000;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const path = req.path || req.url;
    const key = `${ip}:${path}`;

    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.limit) {
      const retryAfterSecs = Math.ceil((record.resetTime - now) / 1000);
      this.logger.warn(`Rate limit exceeded for IP ${ip} on ${path}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests. Please try again in ${retryAfterSecs} seconds.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count += 1;
    return true;
  }
}
