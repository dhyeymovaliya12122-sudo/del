// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/telemetry/telemetry.module.ts
//  PILLAR 5: 📈 Global Telemetry & Observability Module
// ─────────────────────────────────────────────────────────────────────────────

import { Module, Global } from '@nestjs/common';
import { TelemetryService } from './services/telemetry.service';
import { TraceContextService } from './services/trace-context.service';
import { TelemetryController } from './controllers/telemetry.controller';

@Global()
@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService, TraceContextService],
  exports: [TelemetryService, TraceContextService],
})
export class TelemetryModule {}
