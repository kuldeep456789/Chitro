import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxRetries = 5;
    const retryDelayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to Neon PostgreSQL database');
        return;
      } catch (err: any) {
        this.logger.warn(
          `Database connection attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${retryDelayMs}ms...`,
        );
        if (attempt === maxRetries) {
          this.logger.error(`Could not connect to database after ${maxRetries} attempts.`);
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from Neon PostgreSQL database');
  }
}
