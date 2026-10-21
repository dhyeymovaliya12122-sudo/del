import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { OptOutService } from '../services/opt-out.service';

@Controller('opt-out')
export class OptOutController {
  constructor(private readonly optOutService: OptOutService) {}

  @Get()
  findAll(@Query('accountId') accountId?: string) {
    return this.optOutService.findAll(accountId);
  }

  @Post()
  optOut(
    @Body('accountId') accountId: string,
    @Body('phoneNumber') phoneNumber: string,
    @Body('name') name?: string,
    @Body('reason') reason?: string,
  ) {
    return this.optOutService.optOut(accountId, phoneNumber, name, reason);
  }

  @Delete(':accountId/:phoneNumber')
  optIn(
    @Param('accountId') accountId: string,
    @Param('phoneNumber') phoneNumber: string,
  ) {
    return this.optOutService.optIn(accountId, phoneNumber);
  }

  @Post('bulk-import')
  bulkImport(
    @Body('accountId') accountId: string,
    @Body('numbers') numbers: { phoneNumber: string; name?: string }[],
  ) {
    return this.optOutService.bulkImport(accountId, numbers);
  }

  @Post('check')
  checkOptOut(
    @Body('accountId') accountId: string,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    return this.optOutService.isOptedOut(accountId, phoneNumber);
  }
}
