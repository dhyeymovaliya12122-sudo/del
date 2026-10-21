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
var SessionCryptoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionCryptoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
let SessionCryptoService = SessionCryptoService_1 = class SessionCryptoService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(SessionCryptoService_1.name);
        this.algorithm = config.get('security.sessionAlgorithm', 'aes-256-cbc');
        this.ivLength = config.get('security.sessionIvLength', 16);
        const hexKey = config.get('security.sessionEncryptionKey', '') || process.env.SESSION_ENCRYPTION_KEY || '';
        const isProd = (config.get('NODE_ENV') || process.env.NODE_ENV) === 'production';
        const knownInsecureKeys = [
            'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
            'change_me_32_bytes_hex_string_here',
            '0000000000000000000000000000000000000000000000000000000000000000',
        ];
        if (isProd && (knownInsecureKeys.includes(hexKey) || hexKey.length < 64)) {
            const msg = '🚨 [SECURITY FATAL] SESSION_ENCRYPTION_KEY is insecure, missing, or using a default placeholder in production! Generate a random key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';
            this.logger.error(msg);
            throw new Error(msg);
        }
        else if (!hexKey || hexKey.length < 64) {
            this.logger.warn('⚠️ SESSION_ENCRYPTION_KEY is not set or too short. Generating a secure runtime fallback key for development.');
            const devSeed = `dev_wa_session_${process.env.COMPUTERNAME || process.env.HOSTNAME || 'localhost'}_secret_salt`;
            this.keyBuffer = crypto.createHash('sha256').update(hexKey || devSeed).digest();
        }
        else {
            this.keyBuffer = Buffer.from(hexKey.slice(0, 64), 'hex');
        }
    }
    encrypt(plaintext) {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, iv);
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const checksum = crypto
            .createHash('sha256')
            .update(plaintext, 'utf8')
            .digest('hex');
        return {
            ciphertext: encrypted.toString('hex'),
            iv: iv.toString('hex'),
            checksum,
        };
    }
    decrypt(payload) {
        const iv = Buffer.from(payload.iv, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.keyBuffer, iv);
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(payload.ciphertext, 'hex')),
            decipher.final(),
        ]);
        const plaintext = decrypted.toString('utf8');
        const checksum = crypto
            .createHash('sha256')
            .update(plaintext, 'utf8')
            .digest('hex');
        if (checksum !== payload.checksum) {
            throw new Error(`Session checksum mismatch — data may be corrupted or tampered`);
        }
        return plaintext;
    }
    computeHmacSha256(secret, body) {
        return crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');
    }
};
exports.SessionCryptoService = SessionCryptoService;
exports.SessionCryptoService = SessionCryptoService = SessionCryptoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SessionCryptoService);
//# sourceMappingURL=session-crypto.service.js.map