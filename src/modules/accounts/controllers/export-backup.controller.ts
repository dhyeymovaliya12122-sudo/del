import {
  Controller, Get, Post, Body, Query, Param, Res, Req,
  HttpCode, HttpStatus, UseGuards, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ExportBackupService, ExportOptions } from '../services/export-backup.service';

import { BackupSchedulerService } from '../services/backup-scheduler.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/app-user.entity';

// In-memory background jobs registry (works seamlessly without requiring active Redis worker)
interface ExportJobState {
  id: string;
  accountId: string;
  format: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  filePath?: string;
  fileSizeBytes?: number;
  error?: string;
  createdAt: number;
  downloadToken?: string;
}

const activeJobs = new Map<string, ExportJobState>();

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('whatsapp/export')
export class ExportBackupController {
  constructor(
    private readonly exportService: ExportBackupService,
    private readonly backupSchedulerService: BackupSchedulerService,
  ) {
    // Ensure exports directory exists
    const exportDir = path.resolve(process.cwd(), 'data', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
  }

  /**
   * GET /whatsapp/export/automated/status
   * Status of daily zero-touch automated backups.
   */
  @Get('automated/status')
  @Roles(UserRole.SUPER_ADMIN)
  async getAutomatedBackupStatus() {
    return this.backupSchedulerService.getStatus();
  }

  /**
   * POST /whatsapp/export/automated/trigger
   * Trigger the automated master backup on-demand.
   */
  @Post('automated/trigger')
  @Roles(UserRole.SUPER_ADMIN)
  async triggerAutomatedBackup() {
    return this.backupSchedulerService.runBackupJob();
  }

  /**
   * GET /whatsapp/export/stats
   * Pre-flight sizing and counts for the export modal dialog.
   */
  @Get('stats')
  async getStats(
    @Query('accountId') accountId: string,
    @Query('chatJid') chatJid?: string,
  ) {
    return this.exportService.getExportStats(accountId, chatJid);
  }

  /**
   * POST /whatsapp/export/sync
   * Fast synchronous stream for immediate single chat or small range exports.
   */
  @Post('sync')
  async exportSync(
    @Body() body: ExportOptions,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;

    // RBAC validation
    await this.exportService.checkUserAccess(user.id || user.sub, user.role, body.accountId);

    const format = body.format || 'zip';

    try {
      if (format === 'excel') {
        await this.exportService.streamExcel(res, body);
      } else if (format === 'pdf') {
        await this.exportService.streamPdf(res, body);
      } else {
        await this.exportService.streamZipArchive(res, body);
      }

      // Record audit log
      await this.exportService.logExport({
        userId: user.id,
        username: user.username,
        userRole: user.role,
        accountId: body.accountId,
        scope: body.scope || (body.chatJid ? 'single_chat' : 'all'),
        format,
        piiRedacted: !!body.piiRedacted,
        ipAddress: String(ip || ''),
        status: 'completed',
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: 500,
          message: `Export failed: ${err.message}`,
        });
      }
    }
  }

  /**
   * POST /whatsapp/export/queue
   * Queues background job for large multi-contact or full account backups.
   */
  @Post('queue')
  @HttpCode(HttpStatus.ACCEPTED)
  async queueExport(
    @Body() body: ExportOptions,
    @Req() req: any,
  ) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    await this.exportService.checkUserAccess(user.id || user.sub, user.role, body.accountId);

    const jobId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const jobState: ExportJobState = {
      id: jobId,
      accountId: body.accountId,
      format: body.format || 'zip',
      status: 'queued',
      progress: 5,
      createdAt: Date.now(),
    };
    activeJobs.set(jobId, jobState);

    // Asynchronously process in background
    setTimeout(() => {
      this.runBackgroundJob(jobId, body, user).catch(err => {
        const j = activeJobs.get(jobId);
        if (j) {
          j.status = 'failed';
          j.error = err.message;
        }
      });
    }, 100);

    return {
      success: true,
      jobId,
      status: 'queued',
      message: 'Export job initiated in background',
    };
  }

  /**
   * GET /whatsapp/export/status/:jobId
   * Polling endpoint to check background export progress.
   */
  @Get('status/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = activeJobs.get(jobId);
    if (!job) {
      return { status: 'not_found' };
    }
    return job;
  }

  /**
   * GET /whatsapp/export/download/:jobId
   * Signed download endpoint for completed background archives.
   */
  @Get('download/:jobId')
  async downloadCompletedJob(
    @Param('jobId') jobId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const job = activeJobs.get(jobId);
    if (!job || job.status !== 'completed' || !job.filePath) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Export file not found or expired.' });
    }

    if (!token) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Missing download token.' });
    }

    const verify = this.exportService.verifySignedDownloadToken(token, job.accountId);
    if (!verify.valid) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid or expired download token.' });
    }

    if (!fs.existsSync(job.filePath)) {
      return res.status(HttpStatus.GONE).json({ message: 'File has already expired from disk.' });
    }

    const filename = path.basename(job.filePath);
    res.download(job.filePath, filename);
  }

  /**
   * GET /whatsapp/export/database
   * Super Admin only: Generates atomic, defragmented SQLite snapshot via VACUUM INTO.
   */
  @Get('database')
  @Roles(UserRole.SUPER_ADMIN)
  async downloadDatabaseSnapshot(
    @Req() req: any,
    @Res() res: Response,
  ) {
    const user = req.user;
    if (!user || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admins may export raw database snapshots.');
    }

    const backupsDir = path.resolve(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filename = `whatsapp_snapshot_${Date.now()}.db`;
    const targetPath = path.join(backupsDir, filename);

    try {
      await this.exportService.generateSafeDatabaseSnapshot(targetPath);

      res.setHeader('Content-Type', 'application/vnd.sqlite3');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(targetPath);
      fileStream.pipe(res);

      fileStream.on('close', () => {
        // Clean up temporary snapshot after transfer
        setTimeout(() => {
          if (fs.existsSync(targetPath)) {
            fs.unlink(targetPath, () => {});
          }
        }, 5000);
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: `Database snapshot failed: ${err.message}`,
        });
      }
    }
  }

  /**
   * GET /whatsapp/export/logs
   * Audit trail of all exports.
   */
  @Get('logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getLogs(
    @Query('accountId') accountId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.exportService.getExportLogs(accountId, limit ? parseInt(limit, 10) : 50);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Background Job Runner
  // ─────────────────────────────────────────────────────────────────────────────

  private async runBackgroundJob(jobId: string, body: ExportOptions, user: any) {
    const job = activeJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.progress = 20;

    const exportDir = path.resolve(process.cwd(), 'data', 'exports');
    const ext = body.format === 'excel' ? 'xlsx' : body.format === 'pdf' ? 'pdf' : 'zip';
    const filePath = path.join(exportDir, `export_${job.accountId}_${jobId}.${ext}`);

    const writeStream = fs.createWriteStream(filePath);
    job.progress = 40;

    if (body.format === 'excel') {
      await this.exportService.streamExcel(writeStream as any, body);
    } else if (body.format === 'pdf') {
      await this.exportService.streamPdf(writeStream as any, body);
    } else {
      await this.exportService.streamZipArchive(writeStream as any, body);
    }

    job.progress = 90;

    // Check size
    const stats = fs.statSync(filePath);
    job.fileSizeBytes = stats.size;
    job.filePath = filePath;

    // Generate signed download token (1-hour TTL)
    const { token } = this.exportService.generateSignedDownloadToken(jobId, job.accountId, 3600);
    job.downloadToken = token;
    job.status = 'completed';
    job.progress = 100;

    // Audit log
    await this.exportService.logExport({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      accountId: body.accountId,
      scope: body.scope || 'all',
      format: body.format || 'zip',
      fileSizeBytes: stats.size,
      status: 'completed',
    });

    // Auto-delete file after 24 hours
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
      activeJobs.delete(jobId);
    }, 24 * 60 * 60 * 1000);
  }
}
