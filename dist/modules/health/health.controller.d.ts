export declare class HealthController {
    check(): {
        status: string;
        timestamp: string;
        service: string;
        phase: string;
        features: {
            proxyBinding: string;
            sessionHydration: string;
            securityGuard: string;
        };
    };
}
