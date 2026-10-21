import {
  Controller, Get, Post, Delete, Body, Param, Query,
  Headers, UnauthorizedException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SchedulerService } from '../services/scheduler.service';
import { ScheduleRepeat } from '../entities/scheduled-message.entity';

@Controller('scheduler')
export class SchedulerController {
  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly jwtService: JwtService,
  ) {}

  private getUser(auth: string) {
    if (!auth) throw new UnauthorizedException('No token');
    return this.jwtService.verify(auth.replace('Bearer ', ''));
  }

  /** GET /scheduler?accountId=... — list scheduled messages (frontend primary route) */
  @Get()
  async getScheduledRoot(
    @Headers('authorization') auth: string,
    @Query('accountId') accountId: string,
  ) {
    this.getUser(auth);
    return this.schedulerService.getScheduledMessages(accountId);
  }

  /** GET /scheduler/messages?accountId=... — alias kept for compatibility */
  @Get('messages')
  async getScheduled(
    @Headers('authorization') auth: string,
    @Query('accountId') accountId: string,
  ) {
    this.getUser(auth);
    return this.schedulerService.getScheduledMessages(accountId);
  }

  /** POST /scheduler — create scheduled message (frontend primary route) */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async scheduleMessageRoot(
    @Headers('authorization') auth: string,
    @Body() body: {
      accountId: string;
      toJid: string;
      messageText: string;
      scheduledAt: string;
      repeatType?: ScheduleRepeat;
      caption?: string;
    },
  ) {
    this.getUser(auth);
    return this.schedulerService.createScheduledMessage({
      ...body,
      scheduledAt: new Date(body.scheduledAt),
    });
  }

  /** POST /scheduler/schedule — alias kept for compatibility */
  @Post('schedule')
  @HttpCode(HttpStatus.CREATED)
  async scheduleMessage(
    @Headers('authorization') auth: string,
    @Body() body: {
      accountId: string;
      toJid: string;
      messageText: string;
      scheduledAt: string;
      repeatType?: ScheduleRepeat;
      caption?: string;
    },
  ) {
    this.getUser(auth);
    return this.schedulerService.createScheduledMessage({
      ...body,
      scheduledAt: new Date(body.scheduledAt),
    });
  }

  @Post('cancel/:id')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Query('accountId') accountId: string,
  ) {
    this.getUser(auth);
    return this.schedulerService.cancelScheduledMessage(id, accountId);
  }

  @Delete(':id')
  async delete(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Query('accountId') accountId: string,
  ) {
    this.getUser(auth);
    return this.schedulerService.deleteScheduledMessage(id, accountId);
  }
}
