import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class HmacValidationGuard implements CanActivate {
    private readonly config;
    private readonly logger;
    private readonly secret;
    private readonly signatureHeader;
    constructor(config: ConfigService);
    canActivate(context: ExecutionContext): boolean;
    private computeHmac;
    private timingSafeEqual;
}
