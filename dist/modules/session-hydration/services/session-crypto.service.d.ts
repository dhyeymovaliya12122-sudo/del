import { ConfigService } from '@nestjs/config';
export interface EncryptedPayload {
    ciphertext: string;
    iv: string;
    checksum: string;
}
export declare class SessionCryptoService {
    private readonly config;
    private readonly logger;
    private readonly algorithm;
    private readonly keyBuffer;
    private readonly ivLength;
    constructor(config: ConfigService);
    encrypt(plaintext: string): EncryptedPayload;
    decrypt(payload: EncryptedPayload): string;
    computeHmacSha256(secret: string, body: string | Buffer): string;
}
