// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/telemetry/controllers/telemetry.controller.ts
//  PILLAR 5: 📈 Prometheus Scrape & OpenTelemetry Tracing Endpoints
// ─────────────────────────────────────────────────────────────────────────────

import { Controller, Get, Param, Res, Query, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { TelemetryService } from '../services/telemetry.service';
import { TraceContextService } from '../services/trace-context.service';
import { Public } from '../../../common/decorators/public.decorator';

@Controller()
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly traceService: TraceContextService,
  ) {}

  /**
   * Standard Prometheus scrape endpoint
   * GET /metrics (excluded from global prefix) & GET /api/v1/telemetry/metrics
   */
  @Public()
  @SkipThrottle()
  @Get(['metrics', 'telemetry/metrics'])
  async getPrometheusMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.telemetryService.getMetrics();
    res.setHeader('Content-Type', this.telemetryService.getContentType());
    res.status(200).send(metrics);
  }

  /**
   * High-level JSON summary of current metrics for frontend dashboards
   * GET /api/v1/telemetry/summary
   */
  @Get('telemetry/summary')
  async getMetricsSummary() {
    return this.telemetryService.getMetricsSummary();
  }

  /**
   * Recent OpenTelemetry distributed traces
   * GET /api/v1/telemetry/traces
   */
  @Get('telemetry/traces')
  getRecentTraces(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return {
      count: this.traceService.getRecentTraces(parsedLimit).length,
      traces: this.traceService.getRecentTraces(parsedLimit),
    };
  }

  /**
   * Inspect a specific distributed trace lifecycle by traceId
   * GET /api/v1/telemetry/traces/:traceId
   */
  @Get('telemetry/traces/:traceId')
  getTraceDetail(@Param('traceId') traceId: string) {
    const trace = this.traceService.getTrace(traceId);
    if (!trace) {
      throw new NotFoundException(`Trace with ID ${traceId} not found`);
    }
    return trace;
  }
}
