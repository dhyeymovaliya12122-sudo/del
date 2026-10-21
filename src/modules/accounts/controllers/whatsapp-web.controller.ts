import {
  Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Res, Req, UseGuards,
  BadRequestException, UseInterceptors, UploadedFile, Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { WhatsappWebService } from '../services/whatsapp-web.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AccountIsolationGuard } from '../../../common/guards/account-isolation.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/app-user.entity';

@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsappWebController {
  constructor(private readonly whatsappWebService: WhatsappWebService) {}

  @Get('chats')
  @UseGuards(AccountIsolationGuard)
  async getChats(
    @Query('accountId') accountId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    return this.whatsappWebService.getChats(
      accountId,
      search,
      limit ? parseInt(limit, 10) : 500,
      offset ? parseInt(offset, 10) : 0,
      startDate,
      endDate,
    );
  }

  @Get('chats/:jid/messages')
  @UseGuards(AccountIsolationGuard)
  async getMessages(
    @Param('jid') jid: string,
    @Query('accountId') accountId: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('ghostMode') ghostMode?: string,
    @Headers('x-ghost-mode') ghostHeader?: string,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const isGhost = ghostMode === 'true' || ghostHeader === 'true';
    return this.whatsappWebService.getMessages(
      accountId,
      jid,
      limit ? parseInt(limit, 10) : 100,
      startDate,
      endDate,
      search,
      isGhost,
    );
  }

  @Delete('chats/:jid/messages')
  @UseGuards(AccountIsolationGuard)
  async clearChatMessages(
    @Param('jid') jid: string,
    @Query('accountId') accountId: string,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    return this.whatsappWebService.clearChatMessages(accountId, jid);
  }

  @Get('contacts')
  @UseGuards(AccountIsolationGuard)
  async getContacts(
    @Query('accountId') accountId: string,
    @Query('search') search?: string,
  ) {
    if (!accountId) throw new BadRequestException('accountId is required');
    return this.whatsappWebService.getContacts(accountId, search);
  }

  @Get('media/:accountId/:filename')
  @UseGuards(AccountIsolationGuard)
  async getMedia(
    @Param('accountId') accountId: string,
    @Param('filename') filename: string,
    @Query('name') customName: string,
    @Query('download') download: string,
    @Res() res: any,
  ) {
    return this.whatsappWebService.streamMedia(
      accountId,
      filename,
      res,
      customName,
      download === '1' || download === 'true',
    );
  }

  @Post('messages/send')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Body() body: { accountId: string; to: string; text: string; quotedMsgId?: string },
  ) {
    return this.whatsappWebService.sendMessage(body.accountId, body.to, body.text, body.quotedMsgId);
  }

  @Post('messages/send-voice')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async sendVoice(
    @Body()
    body: {
      accountId: string;
      to: string;
      base64Data: string;
      quotedMsgId?: string;
    },
  ) {
    const base64Clean = body.base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    return this.whatsappWebService.sendVoiceNote(body.accountId, body.to, buffer, body.quotedMsgId);
  }

  @Post('messages/react')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async sendReaction(
    @Body()
    body: {
      accountId: string;
      to: string;
      messageId: string;
      emoji: string;
      fromMe?: boolean;
    },
  ) {
    return this.whatsappWebService.sendReaction(
      body.accountId,
      body.to,
      body.messageId,
      body.emoji,
      body.fromMe,
    );
  }

  @Post('messages/send-media')
  @UseGuards(AccountIsolationGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
      fileFilter: (req, file, cb) => {
        const blockedExtensions = /\.(exe|bat|cmd|sh|php|cgi|jar|vbs|msi|scr|com|pif)$/i;
        if (blockedExtensions.test(file.originalname)) {
          return cb(new BadRequestException('Executable or script files are forbidden.'), false);
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async sendMedia(
    @UploadedFile() file: any,
    @Body()
    body: {
      accountId: string;
      to: string;
      fileName?: string;
      mimeType?: string;
      base64Data?: string;
      caption?: string;
    },
  ) {
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    const blockedExtensions = /\.(exe|bat|cmd|sh|php|cgi|jar|vbs|msi|scr|com|pif)$/i;

    if (file && file.buffer) {
      buffer = file.buffer;
      fileName = body.fileName || file.originalname || 'attachment';
      mimeType = body.mimeType || file.mimetype || 'application/octet-stream';
    } else if (body.base64Data) {
      const base64Clean = body.base64Data.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(base64Clean, 'base64');
      if (buffer.length > 50 * 1024 * 1024) {
        throw new BadRequestException('Media payload exceeds 50MB limit.');
      }
      fileName = body.fileName || 'attachment';
      if (blockedExtensions.test(fileName)) {
        throw new BadRequestException('Executable or script files are forbidden.');
      }
      mimeType = body.mimeType || 'application/octet-stream';
    } else {
      throw new BadRequestException('No file or base64Data provided for media message.');
    }

    return this.whatsappWebService.sendMedia(
      body.accountId,
      body.to,
      buffer,
      fileName,
      mimeType,
      body.caption,
    );
  }

  @Post('clean-demo')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async cleanDemoAccounts() {
    return this.whatsappWebService.cleanDemoAccounts();
  }

  @Get('qr/:accountId')
  @UseGuards(AccountIsolationGuard)
  async getQR(@Param('accountId') accountId: string) {
    return this.whatsappWebService.getQR(accountId);
  }

  @Post('qr')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async startQR(@Body() body: { accountId: string; force?: boolean }) {
    return this.whatsappWebService.startQR(body.accountId, body.force);
  }

  @Post('sync')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async syncAll(@Body() body: { accountId: string }) {
    return this.whatsappWebService.syncAll(body.accountId);
  }

  @Post('reconnect')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async reconnect(@Body() body: { accountId: string }) {
    return this.whatsappWebService.reconnect(body.accountId);
  }

  @Post('logout')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: { accountId: string; disconnectedBy?: string }, @Req() req: any) {
    const who = body.disconnectedBy || req?.user?.displayName || req?.user?.username || 'Super Admin / Web User';
    return this.whatsappWebService.logout(body.accountId, who);
  }

  @Post('chats')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async saveChat(
    @Body() body: { accountId: string; id: string; name?: string; isGroup?: boolean },
  ) {
    return this.whatsappWebService.saveChat(body.accountId, body);
  }

  @Post('chats/:jid/sync')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async syncChat(
    @Param('jid') jid: string,
    @Body() body: { accountId: string; count?: number },
  ) {
    return this.whatsappWebService.syncChatMessages(body.accountId, jid, body.count || 25);
  }

  @Post('flush')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async flushAccount(@Body() body: { accountId: string }) {
    return this.whatsappWebService.flushAccount(body.accountId);
  }

  /** POST /api/v1/whatsapp/media/repair
   *  Body: { accountId: string }  — pass "all" to repair every account.
   *  Backfills DB mediaUrl from files already on disk (fast, no network),
   *  then attempts to re-download any still-missing files from WhatsApp.
   */
  @Post('media/repair')
  @UseGuards(AccountIsolationGuard)
  @HttpCode(HttpStatus.OK)
  async repairMedia(@Body() body: { accountId: string }) {
    return this.whatsappWebService.repairMedia(body.accountId);
  }
}
