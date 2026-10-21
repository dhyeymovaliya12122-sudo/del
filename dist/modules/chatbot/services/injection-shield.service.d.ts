export interface ShieldResult {
    safe: boolean;
    sanitized: string;
    reason?: string;
}
export declare class InjectionShieldService {
    private readonly logger;
    private readonly INJECTION_PATTERNS;
    private readonly DELIMITER_PATTERN;
    private readonly MAX_INPUT_LENGTH;
    sanitize(text: string): ShieldResult;
}
