import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Headers, UnauthorizedException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AutoReplyService } from '../services/auto-reply.service';
import { AutoReplyRuleEntity } from '../entities/auto-reply-rule.entity';

@Controller('auto-reply')
export class AutoReplyController {
  constructor(
    private readonly autoReplyService: AutoReplyService,
    private readonly jwtService: JwtService,
  ) {}

  private getUser(auth: string) {
    if (!auth) throw new UnauthorizedException('No token');
    return this.jwtService.verify(auth.replace('Bearer ', ''));
  }

  /** GET /auto-reply?accountId=... — list rules (frontend primary route) */
  @Get()
  async getRulesRoot(
    @Headers('authorization') auth: string,
    @Query('accountId') accountId: string,
  ) {
    this.getUser(auth);
    return this.autoReplyService.getRules(accountId);
  }

  /** GET /auto-reply/rules?accountId=... — alias kept for compatibility */
  @Get('rules')
  async getRules(
    @Headers('authorization') auth: string,
    @Query('accountId') accountId: string,
  ) {
    this.getUser(auth);
    return this.autoReplyService.getRules(accountId);
  }

  /** POST /auto-reply — create rule (frontend primary route) */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRuleRoot(
    @Headers('authorization') auth: string,
    @Body() body: Partial<AutoReplyRuleEntity>,
  ) {
    this.getUser(auth);
    return this.autoReplyService.createRule(body);
  }

  /** POST /auto-reply/rules — alias kept for compatibility */
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @Headers('authorization') auth: string,
    @Body() body: Partial<AutoReplyRuleEntity>,
  ) {
    this.getUser(auth);
    return this.autoReplyService.createRule(body);
  }

  /** PATCH /auto-reply/:id — update rule (frontend primary route) */
  @Patch(':id')
  async updateRuleById(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: Partial<AutoReplyRuleEntity>,
  ) {
    this.getUser(auth);
    // Guard against toggle route being caught here
    if (id === 'rules') throw new UnauthorizedException('Invalid route');
    return this.autoReplyService.updateRule(id, body);
  }

  /** PATCH /auto-reply/:id/toggle — toggle rule (frontend primary route) */
  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleRuleById(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    this.getUser(auth);
    return this.autoReplyService.toggleRule(id);
  }

  /** PATCH /auto-reply/rules/:id — alias kept for compatibility */
  @Patch('rules/:id')
  async updateRule(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: Partial<AutoReplyRuleEntity>,
  ) {
    this.getUser(auth);
    return this.autoReplyService.updateRule(id, body);
  }

  /** POST /auto-reply/rules/:id/toggle — alias kept for compatibility */
  @Post('rules/:id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleRule(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    this.getUser(auth);
    return this.autoReplyService.toggleRule(id);
  }

  /** DELETE /auto-reply/:id — delete rule (frontend primary route) */
  @Delete(':id')
  async deleteRuleById(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    this.getUser(auth);
    return this.autoReplyService.deleteRule(id);
  }

  /** DELETE /auto-reply/rules/:id — alias kept for compatibility */
  @Delete('rules/:id')
  async deleteRule(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    this.getUser(auth);
    return this.autoReplyService.deleteRule(id);
  }
}
