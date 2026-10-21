import { z } from 'zod';
export declare function validateLLM<T>(schema: z.ZodSchema<T>, raw: string | null | undefined, fallback: T, context?: string): T;
export declare function isSafeContent(text: string): boolean;
export declare const SAFE_FALLBACK_MSG = "I'll connect you with our team for more details on that.";
