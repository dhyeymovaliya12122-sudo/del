// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/services/session-crypto.service.ts
//  Feature 2: Encryption / Decryption of WhatsApp Auth Payloads
//
//  Algorithm: AES-256-CBC
//  Key source: SESSION_ENCRYPTION_KEY env (32-byte hex string)
//  IV: random 16-bytes generated per encryption, stored alongside ciphertext
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedPayload {
  ciphertext: string;  // hex-encoded encrypted data
  iv: string;          // hex-encoded random IV
  checksum: string;    // SHA-256 of original plaintext (hex)
}

@Injectable()
export class SessionCryptoService {
  private readonly logger = new Logger(SessionCryptoService.name);
  private readonly algorithm: string;
  private readonly keyBuffer: Buffer;
  private readonly ivLength: number;

  constructor(private readonly config: ConfigService) {
    this.algorithm = config.get<string>('security.sessionAlgorithm', 'aes-256-cbc');
    this.ivLength = config.get<number>('security.sessionIvLength', 16);

    const hexKey = config.get<string>('security.sessionEncryptionKey', '') || process.env.SESSION_ENCRYPTION_KEY || '';
    const isProd = (config.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'production';
    const knownInsecureKeys = [
      'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      'change_me_32_bytes_hex_string_here',
      '0000000000000000000000000000000000000000000000000000000000000000',
    ];

    if (isProd && (knownInsecureKeys.includes(hexKey) || hexKey.length < 64)) {
      const msg = '🚨 [SECURITY FATAL] SESSION_ENCRYPTION_KEY is insecure, missing, or using a default placeholder in production! Generate a random key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';
      this.logger.error(msg);
      throw new Error(msg);
    } else if (!hexKey || hexKey.length < 64) {
      this.logger.warn(
        '⚠️ SESSION_ENCRYPTION_KEY is not set or too short. Generating a secure runtime fallback key for development.',
      );
      // In development, derive a persistent machine-specific 32-byte key rather than 32 zero bytes
      const devSeed = `dev_wa_session_${process.env.COMPUTERNAME || process.env.HOSTNAME || 'localhost'}_secret_salt`;
      this.keyBuffer = crypto.createHash('sha256').update(hexKey || devSeed).digest();
    } else {
      this.keyBuffer = Buffer.from(hexKey.slice(0, 64), 'hex');
    }
  }

  /**
   * Encrypt plaintext auth payload.
   * @param plaintext  JSON string of Baileys auth state
   */
  encrypt(plaintext: string): EncryptedPayload {
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

  /**
   * Decrypt an encrypted auth payload and verify checksum.
   */
  decrypt(payload: EncryptedPayload): string {
    const iv = Buffer.from(payload.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.keyBuffer, iv);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'hex')),
      decipher.final(),
    ]);

    const plaintext = decrypted.toString('utf8');

    // Integrity check
    const checksum = crypto
      .createHash('sha256')
      .update(plaintext, 'utf8')
      .digest('hex');

    if (checksum !== payload.checksum) {
      throw new Error(`Session checksum mismatch — data may be corrupted or tampered`);
    }

    return plaintext;
  }

  /** Compute raw HMAC-SHA256 for webhook verification */
  computeHmacSha256(secret: string, body: string | Buffer): string {
    return crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  }
}
