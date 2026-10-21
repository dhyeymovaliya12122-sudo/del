import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { VerificationService } from '../services/verification.service';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  findAll() {
    return this.verificationService.findAll();
  }

  @Get(':accountId')
  get(@Param('accountId') accountId: string) {
    return this.verificationService.getOrCreate(accountId);
  }

  @Get(':accountId/checklist')
  getChecklist(@Param('accountId') accountId: string) {
    return this.verificationService.getChecklist(accountId);
  }

  @Post(':accountId')
  update(@Param('accountId') accountId: string, @Body() data: any) {
    return this.verificationService.update(accountId, data);
  }
}
