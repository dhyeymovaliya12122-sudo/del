import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { TemplatesService, CreateTemplateDto } from '../services/templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@Query('accountId') accountId?: string) {
    return this.templatesService.findAll(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.templatesService.update(id, dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string) {
    return this.templatesService.submit(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body('metaTemplateId') metaTemplateId?: string) {
    return this.templatesService.approve(id, metaTemplateId);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.templatesService.reject(id, reason);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }
}
