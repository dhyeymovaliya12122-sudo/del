import { z } from 'zod';
declare const HandoffSchema: z.ZodObject<{
    customerBrief: z.ZodString;
    suggestedResponse: z.ZodString;
    priority: z.ZodUnion<readonly [z.ZodLiteral<"LOW">, z.ZodLiteral<"MEDIUM">, z.ZodLiteral<"HIGH">, z.ZodLiteral<"URGENT">]>;
    keyFacts: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type HandoffBrief = z.infer<typeof HandoffSchema>;
export declare class EscalationAgentService {
    private readonly logger;
    generateHandoff(chatJid: string, sessionVariables: Record<string, any>, memory: Record<string, any>, currentNodeId: string): Promise<HandoffBrief>;
}
export {};
