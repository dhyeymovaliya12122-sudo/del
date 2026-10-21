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
var MigrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationService = exports.MIGRATION_STEPS = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const migration_entity_1 = require("../entities/migration.entity");
exports.MIGRATION_STEPS = {
    CONTACTS: 1,
    TEMPLATES: 2,
    CHAT_HISTORY: 4,
    TEST_TRAFFIC: 8,
    CUTOVER: 16,
};
let MigrationService = MigrationService_1 = class MigrationService {
    constructor(migrationRepo) {
        this.migrationRepo = migrationRepo;
        this.logger = new common_1.Logger(MigrationService_1.name);
    }
    async findAll(accountId) {
        const where = accountId ? { accountId } : {};
        return this.migrationRepo.find({ where, order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const m = await this.migrationRepo.findOne({ where: { id } });
        if (!m)
            throw new common_1.NotFoundException(`Migration ${id} not found`);
        return m;
    }
    async start(dto) {
        const migration = this.migrationRepo.create({ ...dto, status: 'pending', stepsCompleted: 0 });
        const saved = await this.migrationRepo.save(migration);
        this.logger.log(`[Migration] Started migration for account ${dto.accountId} from ${dto.sourcePhoneNumber}`);
        return saved;
    }
    async completeStep(id, step, data) {
        const migration = await this.findOne(id);
        const stepBit = exports.MIGRATION_STEPS[step];
        const newSteps = migration.stepsCompleted | stepBit;
        const allSteps = Object.values(exports.MIGRATION_STEPS).reduce((a, b) => a | b, 0);
        const newStatus = newSteps === allSteps ? 'completed' : 'in_progress';
        await this.migrationRepo.update(id, {
            stepsCompleted: newSteps,
            status: newStatus,
            ...data,
        });
        return this.findOne(id);
    }
    async verifyTraffic(id, messagesSent) {
        await this.migrationRepo.update(id, {
            testMessagesSent: messagesSent,
            status: 'verified',
        });
        return this.completeStep(id, 'TEST_TRAFFIC', { testMessagesSent: messagesSent });
    }
    async cutover(id) {
        return this.completeStep(id, 'CUTOVER');
    }
    async getProgress(id) {
        const migration = await this.findOne(id);
        const steps = {
            contacts: !!(migration.stepsCompleted & exports.MIGRATION_STEPS.CONTACTS),
            templates: !!(migration.stepsCompleted & exports.MIGRATION_STEPS.TEMPLATES),
            chatHistory: !!(migration.stepsCompleted & exports.MIGRATION_STEPS.CHAT_HISTORY),
            testTraffic: !!(migration.stepsCompleted & exports.MIGRATION_STEPS.TEST_TRAFFIC),
            cutover: !!(migration.stepsCompleted & exports.MIGRATION_STEPS.CUTOVER),
        };
        const completed = Object.values(steps).filter(Boolean).length;
        return { steps, percentComplete: Math.round((completed / 5) * 100) };
    }
};
exports.MigrationService = MigrationService;
exports.MigrationService = MigrationService = MigrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(migration_entity_1.MigrationEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], MigrationService);
//# sourceMappingURL=migration.service.js.map