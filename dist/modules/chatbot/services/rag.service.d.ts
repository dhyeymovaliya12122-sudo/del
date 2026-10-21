import { DataSource } from 'typeorm';
export declare class RagService {
    private readonly ds;
    private readonly logger;
    constructor(ds: DataSource);
    answer(question: string, accountId: string): Promise<string>;
}
