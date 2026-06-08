import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Counter, Histogram } from 'prom-client';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime();

    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const durationInSeconds = diff[0] + diff[1] / 1e9;

      const route = req.route?.path || req.path;
      const statusCode = res.statusCode.toString();

      httpRequestsTotal.inc({
        method: req.method,
        route,
        status_code: statusCode,
      });

      httpRequestDurationSeconds.observe(
        {
          method: req.method,
          route,
          status_code: statusCode,
        },
        durationInSeconds,
      );
    });

    next();
  }
}
