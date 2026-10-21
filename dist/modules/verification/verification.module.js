"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const verification_entity_1 = require("./entities/verification.entity");
const verification_service_1 = require("./services/verification.service");
const verification_controller_1 = require("./controllers/verification.controller");
let VerificationModule = class VerificationModule {
};
exports.VerificationModule = VerificationModule;
exports.VerificationModule = VerificationModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([verification_entity_1.VerificationEntity])],
        controllers: [verification_controller_1.VerificationController],
        providers: [verification_service_1.VerificationService],
        exports: [verification_service_1.VerificationService],
    })
], VerificationModule);
//# sourceMappingURL=verification.module.js.map