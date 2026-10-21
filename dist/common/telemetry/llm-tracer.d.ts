export declare const maskPii: (s: string) => string;
export declare function wrapTrace<T extends (...args: any[]) => Promise<any>>(fn: T, name: string, metadata?: Record<string, string>): Promise<T>;
