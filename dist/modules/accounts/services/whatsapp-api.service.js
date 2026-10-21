"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WhatsappApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappApiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let WhatsappApiService = WhatsappApiService_1 = class WhatsappApiService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(WhatsappApiService_1.name);
        const token = config.get('WHATSAPP_ACCESS_TOKEN', '');
        const version = config.get('WHATSAPP_API_VERSION', 'v19.0');
        this.phoneNumberId = config.get('WHATSAPP_PHONE_NUMBER_ID', '');
        this.http = axios_1.default.create({
            baseURL: `https://graph.facebook.com/${version}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
    }
    async sendText(dto) {
        this.logger.log(`[WhatsApp API] Sending text to ${dto.to}`);
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: dto.to,
            type: 'text',
            text: { preview_url: false, body: dto.text },
        };
        try {
            const { data } = await this.http.post(`/${this.phoneNumberId}/messages`, payload);
            this.logger.log(`[WhatsApp API] ✅ Sent → message id: ${data.messages?.[0]?.id}`);
            return data;
        }
        catch (err) {
            const errData = err.response?.data;
            this.logger.error(`[WhatsApp API] ❌ Send failed: ${JSON.stringify(errData ?? err.message)}`);
            throw new Error(errData?.error?.message ?? err.message);
        }
    }
    async sendTemplate(dto) {
        this.logger.log(`[WhatsApp API] Sending template '${dto.templateName}' to ${dto.to}`);
        const payload = {
            messaging_product: 'whatsapp',
            to: dto.to,
            type: 'template',
            template: {
                name: dto.templateName,
                language: { code: dto.languageCode ?? 'en_US' },
                components: dto.components ?? [],
            },
        };
        try {
            const { data } = await this.http.post(`/${this.phoneNumberId}/messages`, payload);
            this.logger.log(`[WhatsApp API] ✅ Template sent → ${data.messages?.[0]?.id}`);
            return data;
        }
        catch (err) {
            const errData = err.response?.data;
            this.logger.error(`[WhatsApp API] ❌ Template failed: ${JSON.stringify(errData ?? err.message)}`);
            throw new Error(errData?.error?.message ?? err.message);
        }
    }
    async getPhoneNumberInfo() {
        const { data } = await this.http.get(`/${this.phoneNumberId}?fields=display_phone_number,verified_name`);
        return data;
    }
};
exports.WhatsappApiService = WhatsappApiService;
exports.WhatsappApiService = WhatsappApiService = WhatsappApiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsappApiService);
//# sourceMappingURL=whatsapp-api.service.js.map