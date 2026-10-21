"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptOutModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const opt_out_entity_1 = require("./entities/opt-out.entity");
const opt_out_service_1 = require("./services/opt-out.service");
const opt_out_controller_1 = require("./controllers/opt-out.controller");
let OptOutModule = class OptOutModule {
};
exports.OptOutModule = OptOutModule;
exports.OptOutModule = OptOutModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([opt_out_entity_1.OptOutEntity])],
        controllers: [opt_out_controller_1.OptOutController],
        providers: [opt_out_service_1.OptOutService],
        exports: [opt_out_service_1.OptOutService],
    })
], OptOutModule);
//# sourceMappingURL=opt-out.module.js.map