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
var ProxyRotationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyRotationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const proxy_pool_entity_1 = require("../entities/proxy-pool.entity");
let ProxyRotationService = ProxyRotationService_1 = class ProxyRotationService {
    constructor(proxyRepo) {
        this.proxyRepo = proxyRepo;
        this.logger = new common_1.Logger(ProxyRotationService_1.name);
    }
    async rotateForAccount(accountId) {
        const current = await this.proxyRepo.findOne({
            where: { assignedAccountId: accountId },
        });
        if (current) {
            current.assignedAccountId = undefined;
            await this.proxyRepo.save(current);
            this.logger.log(`Releasing proxy [${current.label}] from account ${accountId}`);
        }
        const next = await this.proxyRepo.findOne({
            where: {
                isActive: true,
                isHealthy: true,
                assignedAccountId: undefined,
                ...(current ? { id: (0, typeorm_2.Not)(current.id) } : {}),
            },
            order: { lastHealthCheck: 'DESC' },
        });
        if (!next) {
            throw new common_1.NotFoundException(`No healthy replacement proxy available for account ${accountId}`);
        }
        next.assignedAccountId = accountId;
        await this.proxyRepo.save(next);
        this.logger.log(`Rotated proxy → [${next.label}] for account ${accountId}`);
        return next;
    }
};
exports.ProxyRotationService = ProxyRotationService;
exports.ProxyRotationService = ProxyRotationService = ProxyRotationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proxy_pool_entity_1.ProxyPoolEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProxyRotationService);
//# sourceMappingURL=proxy-rotation.service.js.map