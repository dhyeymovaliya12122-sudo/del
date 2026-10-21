import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MigrationService, StartMigrationDto } from '../services/migration.service';

@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get()
  findAll(@Query('accountId') accountId?: string) {
    return this.migrationService.findAll(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.migrationService.findOne(id);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string) {
    return this.migrationService.getProgress(id);
  }

  @Post('start')
  start(@Body() dto: StartMigrationDto) {
    return this.migrationService.start(dto);
  }

  @Post(':id/step/:step')
  completeStep(
    @Param('id') id: string,
    @Param('step') step: string,
    @Body() data: any,
  ) {
    return this.migrationService.completeStep(id, step.toUpperCase() as any, data);
  }

  @Post(':id/verify-traffic')
  verifyTraffic(@Param('id') id: string, @Body('messagesSent') messagesSent: number) {
    return this.migrationService.verifyTraffic(id, messagesSent);
  }

  @Post(':id/cutover')
  cutover(@Param('id') id: string) {
    return this.migrationService.cutover(id);
  }
}
