import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AiFeatures1727000000001 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
