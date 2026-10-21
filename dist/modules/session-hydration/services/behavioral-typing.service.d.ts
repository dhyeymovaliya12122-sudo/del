export interface TypingSimulationOptions {
    enabled?: boolean;
    minWpm?: number;
    maxWpm?: number;
    maxTypingDurationMs?: number;
}
export declare class BehavioralTypingService {
    private readonly logger;
    simulateHumanDispatch(socket: any, jid: string, text: string, options?: TypingSimulationOptions): Promise<void>;
    sampleGaussian(mean: number, stdev: number): number;
}
