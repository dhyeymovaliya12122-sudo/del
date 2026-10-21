import {
  Controller, Get, Post, Delete, Body, Param, Query,
} from '@nestjs/common';
import { CampaignsService, CreateCampaignDto, BulkRecipient } from '../services/campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAll(@Query('accountId') accountId?: string) {
    return this.campaignsService.findAll(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Post(':id/recipients')
  addRecipients(
    @Param('id') id: string,
    @Body('recipients') recipients: BulkRecipient[],
  ) {
    return this.campaignsService.addRecipients(id, recipients);
  }

  @Get(':id/recipients')
  getRecipients(@Param('id') id: string) {
    return this.campaignsService.getRecipients(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.campaignsService.getStats(id);
  }

  @Post(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.campaignsService.updateStatus(id, status as any);
  }

  @Post(':id/send')
  sendNow(@Param('id') id: string) {
    return this.campaignsService.updateStatus(id, 'running');
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.campaignsService.delete(id);
  }
}
