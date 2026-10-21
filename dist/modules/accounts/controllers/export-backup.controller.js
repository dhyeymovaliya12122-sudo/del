"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportBackupController = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const export_backup_service_1 = require("../services/export-backup.service");
const backup_scheduler_service_1 = require("../services/backup-scheduler.service");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
const activeJobs = new Map();
let ExportBackupController = class ExportBackupController {
    constructor(exportService, backupSchedulerService) {
        this.exportService = exportService;
        this.backupSchedulerService = backupSchedulerService;
        const exportDir = path.resolve(process.cwd(), 'data', 'exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }
    }
    async getAutomatedBackupStatus() {
        return this.backupSchedulerService.getStatus();
    }
    async triggerAutomatedBackup() {
        return this.backupSchedulerService.runBackupJob();
    }
    async getStats(accountId, chatJid) {
        return this.exportService.getExportStats(accountId, chatJid);
    }
    async exportSync(body, req, res) {
        const user = req.user;
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required.');
        }
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
        await this.exportService.checkUserAccess(user.id || user.sub, user.role, body.accountId);
        const format = body.format || 'zip';
        try {
            if (format === 'excel') {
                await this.exportService.streamExcel(res, body);
            }
            else if (format === 'pdf') {
                await this.exportService.streamPdf(res, body);
            }
            else {
                await this.exportService.streamZipArchive(res, body);
            }
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
        }
        catch (err) {
            if (!res.headersSent) {
                res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    statusCode: 500,
                    message: `Export failed: ${err.message}`,
                });
            }
        }
    }
    async queueExport(body, req) {
        const user = req.user;
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required.');
        }
        await this.exportService.checkUserAccess(user.id || user.sub, user.role, body.accountId);
        const jobId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const jobState = {
            id: jobId,
            accountId: body.accountId,
            format: body.format || 'zip',
            status: 'queued',
            progress: 5,
            createdAt: Date.now(),
        };
        activeJobs.set(jobId, jobState);
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
    async getJobStatus(jobId) {
        const job = activeJobs.get(jobId);
        if (!job) {
            return { status: 'not_found' };
        }
        return job;
    }
    async downloadCompletedJob(jobId, token, res) {
        const job = activeJobs.get(jobId);
        if (!job || job.status !== 'completed' || !job.filePath) {
            return res.status(common_1.HttpStatus.NOT_FOUND).json({ message: 'Export file not found or expired.' });
        }
        if (!token) {
            return res.status(common_1.HttpStatus.UNAUTHORIZED).json({ message: 'Missing download token.' });
        }
        const verify = this.exportService.verifySignedDownloadToken(token, job.accountId);
        if (!verify.valid) {
            return res.status(common_1.HttpStatus.UNAUTHORIZED).json({ message: 'Invalid or expired download token.' });
        }
        if (!fs.existsSync(job.filePath)) {
            return res.status(common_1.HttpStatus.GONE).json({ message: 'File has already expired from disk.' });
        }
        const filename = path.basename(job.filePath);
        res.download(job.filePath, filename);
    }
    async downloadDatabaseSnapshot(req, res) {
        const user = req.user;
        if (!user || user.role !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only Super Admins may export raw database snapshots.');
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
                setTimeout(() => {
                    if (fs.existsSync(targetPath)) {
                        fs.unlink(targetPath, () => { });
                    }
                }, 5000);
            });
        }
        catch (err) {
            if (!res.headersSent) {
                res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                    message: `Database snapshot failed: ${err.message}`,
                });
            }
        }
    }
    async getLogs(accountId, limit) {
        return this.exportService.getExportLogs(accountId, limit ? parseInt(limit, 10) : 50);
    }
    async runBackgroundJob(jobId, body, user) {
        const job = activeJobs.get(jobId);
        if (!job)
            return;
        job.status = 'processing';
        job.progress = 20;
        const exportDir = path.resolve(process.cwd(), 'data', 'exports');
        const ext = body.format === 'excel' ? 'xlsx' : body.format === 'pdf' ? 'pdf' : 'zip';
        const filePath = path.join(exportDir, `export_${job.accountId}_${jobId}.${ext}`);
        const writeStream = fs.createWriteStream(filePath);
        job.progress = 40;
        if (body.format === 'excel') {
            await this.exportService.streamExcel(writeStream, body);
        }
        else if (body.format === 'pdf') {
            await this.exportService.streamPdf(writeStream, body);
        }
        else {
            await this.exportService.streamZipArchive(writeStream, body);
        }
        job.progress = 90;
        const stats = fs.statSync(filePath);
        job.fileSizeBytes = stats.size;
        job.filePath = filePath;
        const { token } = this.exportService.generateSignedDownloadToken(jobId, job.accountId, 3600);
        job.downloadToken = token;
        job.status = 'completed';
        job.progress = 100;
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
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, () => { });
            }
            activeJobs.delete(jobId);
        }, 24 * 60 * 60 * 1000);
    }
};
exports.ExportBackupController = ExportBackupController;
__decorate([
    (0, common_1.Get)('automated/status'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "getAutomatedBackupStatus", null);
__decorate([
    (0, common_1.Post)('automated/trigger'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "triggerAutomatedBackup", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('accountId')),
    __param(1, (0, common_1.Query)('chatJid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "exportSync", null);
__decorate([
    (0, common_1.Post)('queue'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "queueExport", null);
__decorate([
    (0, common_1.Get)('status/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Get)('download/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Query)('token')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "downloadCompletedJob", null);
__decorate([
    (0, common_1.Get)('database'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "downloadDatabaseSnapshot", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('accountId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExportBackupController.prototype, "getLogs", null);
exports.ExportBackupController = ExportBackupController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('whatsapp/export'),
    __metadata("design:paramtypes", [export_backup_service_1.ExportBackupService,
        backup_scheduler_service_1.BackupSchedulerService])
], ExportBackupController);
//# sourceMappingURL=export-backup.controller.js.map