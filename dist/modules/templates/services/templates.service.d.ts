import { Repository } from 'typeorm';
import { TemplateEntity, TemplateCategory } from '../entities/template.entity';
export interface CreateTemplateDto {
    accountId: string;
    name: string;
    category?: TemplateCategory;
    language?: string;
    body: string;
    header?: string;
    footer?: string;
    buttons?: any[];
}
export declare class TemplatesService {
    private readonly templateRepo;
    private readonly logger;
    constructor(templateRepo: Repository<TemplateEntity>);
    findAll(accountId?: string): Promise<TemplateEntity[]>;
    findOne(id: string): Promise<TemplateEntity>;
    create(dto: CreateTemplateDto): Promise<TemplateEntity>;
    update(id: string, dto: Partial<CreateTemplateDto>): Promise<TemplateEntity>;
    submit(id: string): Promise<TemplateEntity>;
    approve(id: string, metaTemplateId?: string): Promise<TemplateEntity>;
    reject(id: string, reason: string): Promise<TemplateEntity>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
