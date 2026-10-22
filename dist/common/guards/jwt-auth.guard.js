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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const core_1 = require("@nestjs/core");
let JwtAuthGuard = class JwtAuthGuard {
    constructor(jwtService, reflector) {
        this.jwtService = jwtService;
        this.reflector = reflector;
    }
    canActivate(context) {
        if (this.reflector) {
            const isPublic = this.reflector.getAllAndOverride('isPublic', [
                context.getHandler(),
                context.getClass(),
            ]);
            if (isPublic)
                return true;
        }
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        let token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : undefined;
        if (!token && request.query?.token) {
            const isProd = process.env.NODE_ENV === 'production';
            if (isProd) {
                throw new common_1.UnauthorizedException('Token via query parameter is not allowed in production. Use Authorization header or cookie.');
            }
            token = request.query.token.trim();
        }
        if (!token && request.cookies?.token) {
            token = request.cookies.token.trim();
        }
        if (!token && request.cookies?.wa_token) {
            token = request.cookies.wa_token.trim();
        }
        if (!token) {
            throw new common_1.UnauthorizedException('Missing Authorization header or token query parameter');
        }
        try {
            const payload = this.jwtService.verify(token);
            request.user = payload;
            return true;
        }
        catch (err) {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        core_1.Reflector])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map