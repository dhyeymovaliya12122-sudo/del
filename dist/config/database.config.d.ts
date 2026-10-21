declare const _default: (() => {
    type: string;
    path: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
    synchronize: boolean;
    logging: boolean;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    type: string;
    path: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
    synchronize: boolean;
    logging: boolean;
}>;
export default _default;
