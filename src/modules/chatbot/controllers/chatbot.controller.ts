import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ChatbotService, CreateFlowDto } from '../services/chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('flows')
  findAll(@Query('accountId') accountId?: string) {
    return this.chatbotService.findAll(accountId);
  }

  @Get('flows/:id')
  findOne(@Param('id') id: string) {
    return this.chatbotService.findOne(id);
  }

  @Post('flows')
  create(@Body() dto: CreateFlowDto) {
    return this.chatbotService.create(dto);
  }

  @Put('flows/:id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateFlowDto>) {
    return this.chatbotService.update(id, dto);
  }

  @Delete('flows/:id')
  delete(@Param('id') id: string) {
    return this.chatbotService.delete(id);
  }

  @Post('flows/:id/toggle')
  toggleActive(@Param('id') id: string) {
    return this.chatbotService.toggleActive(id);
  }

  @Post('flows/:id/test')
  testFlow(@Param('id') id: string, @Body('message') message: string) {
    return this.chatbotService.testFlow(id, message);
  }
}
