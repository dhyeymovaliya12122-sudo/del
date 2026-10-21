import { ConfigService } from '@nestjs/config';
export interface SendTextMessageDto {
    to: string;
    text: string;
}
export interface SendTemplateMessageDto {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: object[];
}
export interface WaApiResponse {
    messaging_product: string;
    contacts: {
        input: string;
        wa_id: string;
    }[];
    messages: {
        id: string;
    }[];
}
export declare class WhatsappApiService {
    private readonly config;
    private readonly logger;
    private readonly http;
    private readonly phoneNumberId;
    constructor(config: ConfigService);
    sendText(dto: SendTextMessageDto): Promise<WaApiResponse>;
    sendTemplate(dto: SendTemplateMessageDto): Promise<WaApiResponse>;
    getPhoneNumberInfo(): Promise<object>;
}
