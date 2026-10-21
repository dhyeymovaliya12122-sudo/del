import { TemplatesService, CreateTemplateDto } from '../services/templates.service';
export declare class TemplatesController {
    private readonly templatesService;
    constructor(templatesService: TemplatesService);
    findAll(accountId?: string): Promise<import("../entities/template.entity").TemplateEntity[]>;
    findOne(id: string): Promise<import("../entities/template.entity").TemplateEntity>;
    create(dto: CreateTemplateDto): Promise<import("../entities/template.entity").TemplateEntity>;
    update(id: string, dto: Partial<CreateTemplateDto>): Promise<import("../entities/template.entity").TemplateEntity>;
    submit(id: string): Promise<import("../entities/template.entity").TemplateEntity>;
    approve(id: string, metaTemplateId?: string): Promise<import("../entities/template.entity").TemplateEntity>;
    reject(id: string, reason: string): Promise<import("../entities/template.entity").TemplateEntity>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
