import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type HealthCheckName = 'database';

export type HealthResult = {
  status: 'ok' | 'error';
  service: 'approveflow-api';
  timestamp: string;
  uptime: number;
  checks: Record<HealthCheckName, 'ok' | 'error'>;
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResult> {
    const checks: HealthResult['checks'] = {
      database: await this.checkDatabase(),
    };

    const status = Object.values(checks).every((value) => value === 'ok')
      ? 'ok'
      : 'error';

    return {
      status,
      service: 'approveflow-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
