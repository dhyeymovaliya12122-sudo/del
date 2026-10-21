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
var BackupSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = require("fs");
const path = require("path");
const export_backup_service_1 = require("./export-backup.service");
const whatsapp_account_entity_1 = require("../../session-hydration/entities/whatsapp-account.entity");
const export_log_entity_1 = require("../entities/export-log.entity");
let BackupSchedulerService = BackupSchedulerService_1 = class BackupSchedulerService {
    constructor(exportBackupService, accountRepo, exportLogRepo) {
        this.exportBackupService = exportBackupService;
        this.accountRepo = accountRepo;
        this.exportLogRepo = exportLogRepo;
        this.logger = new common_1.Logger(BackupSchedulerService_1.name);
        this.isRunning = false;
        this.lastStatus = {
            enabled: true,
            schedule: 'Daily at 02:00 AM',
            retentionDays: 30,
            lastBackupAt: null,
            lastFileName: null,
            lastFileSizeBytes: null,
            lastFileSizeFormatted: null,
            totalAccounts: 0,
            status: 'idle',
        };
    }
    onModuleInit() {
        this.ensureBackupDir();
        this.refreshStatusFromDisk();
        this.logger.log('🕒 Automated Zero-Touch Backup Scheduler initialized (Daily 02:00 AM, 30-day retention)');
    }
    getBackupDir() {
        return path.resolve(process.cwd(), 'data', 'backups', 'automated');
    }
    ensureBackupDir() {
        const dir = this.getBackupDir();
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    refreshStatusFromDisk() {
        try {
            const dir = this.getBackupDir();
            if (!fs.existsSync(dir))
                return;
            const files = fs.readdirSync(dir)
                .filter(f => f.endsWith('.zip'))
                .map(f => {
                const fullPath = path.join(dir, f);
                const stat = fs.statSync(fullPath);
                return { name: f, size: stat.size, mtime: stat.mtime };
            })
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            if (files.length > 0) {
                const latest = files[0];
                this.lastStatus.lastBackupAt = latest.mtime.toISOString();
                this.lastStatus.lastFileName = latest.name;
                this.lastStatus.lastFileSizeBytes = latest.size;
                this.lastStatus.lastFileSizeFormatted = this.formatBytes(latest.size);
                this.lastStatus.status = 'completed';
            }
        }
        catch (err) {
            this.logger.warn(`Failed to inspect backup directory: ${err.message}`);
        }
    }
    async handleDailyAutomatedBackup() {
        this.logger.log('🕒 Executing daily automated zero-touch system backup...');
        await this.runBackupJob();
    }
    async runBackupJob() {
        if (this.isRunning) {
            this.logger.warn('Automated backup job is already in progress, skipping duplicate invocation.');
            return this.lastStatus;
        }
        this.isRunning = true;
        this.lastStatus.status = 'running';
        this.ensureBackupDir();
        try {
            const accounts = await this.accountRepo.find();
            this.lastStatus.totalAccounts = accounts.length;
            if (accounts.length === 0) {
                this.logger.log('No WhatsApp accounts registered. Skipping automated backup.');
                this.isRunning = false;
                this.lastStatus.status = 'idle';
                return this.lastStatus;
            }
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `${dateStr}_All_Accounts_Master_Backup.zip`;
            const filePath = path.join(this.getBackupDir(), filename);
            const fileStream = fs.createWriteStream(filePath);
            await new Promise((resolve, reject) => {
                fileStream.on('error', reject);
                fileStream.on('close', () => resolve());
                this.exportBackupService.streamZipArchive(fileStream, {
                    accountId: 'all',
                    includeMedia: 'all',
                    scope: 'all',
                }).catch(reject);
            });
            const stat = fs.statSync(filePath);
            this.lastStatus.lastBackupAt = new Date().toISOString();
            this.lastStatus.lastFileName = filename;
            this.lastStatus.lastFileSizeBytes = stat.size;
            this.lastStatus.lastFileSizeFormatted = this.formatBytes(stat.size);
            this.lastStatus.status = 'completed';
            delete this.lastStatus.error;
            this.logger.log(`✅ Daily automated master backup completed: ${filename} (${this.lastStatus.lastFileSizeFormatted})`);
            await this.exportBackupService.logExport({
                userId: 'system-scheduler',
                username: 'Automated Cron Scheduler',
                userRole: 'SYSTEM',
                accountId: 'all',
                scope: 'all',
                format: 'zip',
                fileSizeBytes: stat.size,
                status: 'completed',
            });
            this.applyRetentionPolicy(30);
            return this.lastStatus;
        }
        catch (err) {
            this.logger.error(`❌ Automated backup job failed: ${err.message}`, err.stack);
            this.lastStatus.status = 'failed';
            this.lastStatus.error = err.message;
            return this.lastStatus;
        }
        finally {
            this.isRunning = false;
        }
    }
    applyRetentionPolicy(retentionDays) {
        try {
            const dir = this.getBackupDir();
            if (!fs.existsSync(dir))
                return;
            const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
            const files = fs.readdirSync(dir);
            let purgedCount = 0;
            for (const file of files) {
                if (!file.endsWith('.zip'))
                    continue;
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.mtime.getTime() < cutoff) {
                    fs.unlinkSync(fullPath);
                    purgedCount++;
                }
            }
            if (purgedCount > 0) {
                this.logger.log(`🧹 Retention policy purged ${purgedCount} automated backup(s) older than ${retentionDays} days.`);
            }
        }
        catch (err) {
            this.logger.warn(`Failed to apply backup retention policy: ${err.message}`);
        }
    }
    async getStatus() {
        const accountsCount = await this.accountRepo.count();
        this.lastStatus.totalAccounts = accountsCount;
        this.refreshStatusFromDisk();
        return this.lastStatus;
    }
    formatBytes(bytes) {
        if (!bytes)
            return '0 B';
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1048576)
            return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1073741824)
            return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1073741824).toFixed(2)} GB`;
    }
};
exports.BackupSchedulerService = BackupSchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BackupSchedulerService.prototype, "handleDailyAutomatedBackup", null);
exports.BackupSchedulerService = BackupSchedulerService = BackupSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(export_log_entity_1.ExportLogEntity)),
    __metadata("design:paramtypes", [export_backup_service_1.ExportBackupService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], BackupSchedulerService);
//# sourceMappingURL=backup-scheduler.service.js.map