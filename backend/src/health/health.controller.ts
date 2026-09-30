import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let dbStatus = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = `error: ${e.message}`;
    }

    return {
      status: 'ok',
      service: 'Chitro API',
      timestamp: new Date().toISOString(),
      database: {
        provider: 'Neon PostgreSQL',
        status: dbStatus,
      },
    };
  }
}
