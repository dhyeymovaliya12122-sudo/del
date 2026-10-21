"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const migration_entity_1 = require("./entities/migration.entity");
const migration_service_1 = require("./services/migration.service");
const migration_controller_1 = require("./controllers/migration.controller");
let MigrationModule = class MigrationModule {
};
exports.MigrationModule = MigrationModule;
exports.MigrationModule = MigrationModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([migration_entity_1.MigrationEntity])],
        controllers: [migration_controller_1.MigrationController],
        providers: [migration_service_1.MigrationService],
        exports: [migration_service_1.MigrationService],
    })
], MigrationModule);
//# sourceMappingURL=migration.module.js.map