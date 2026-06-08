import { Controller, Get, Header } from '@nestjs/common';
import { collectDefaultMetrics, register } from 'prom-client';
import { MetricsService } from './metrics.service';

collectDefaultMetrics();

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @Header('Content-Type', register.contentType)
  async getMetrics(): Promise<string> {
    await this.metricsService.updateOnlineUsers();

    return register.metrics();
  }
}
