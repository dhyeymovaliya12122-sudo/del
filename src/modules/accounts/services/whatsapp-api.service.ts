// ─────────────────────────────────────────────────────────────────────────────
//  modules/accounts/services/whatsapp-api.service.ts
//  Meta WhatsApp Business Cloud API integration.
//
//  Sends messages via: POST https://graph.facebook.com/v19.0/{phoneNumberId}/messages
//  Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendTextMessageDto {
  to: string;       // Recipient E.164 phone number (e.g. +919876543210)
  text: string;     // Message body
}

export interface SendTemplateMessageDto {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: object[];
}

export interface WaApiResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

@Injectable()
export class WhatsappApiService {
  private readonly logger = new Logger(WhatsappApiService.name);
  private readonly http: AxiosInstance;
  private readonly phoneNumberId: string;

  constructor(private readonly config: ConfigService) {
    const token = config.get<string>('WHATSAPP_ACCESS_TOKEN', '');
    const version = config.get<string>('WHATSAPP_API_VERSION', 'v19.0');
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');

    this.http = axios.create({
      baseURL: `https://graph.facebook.com/${version}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  /**
   * Send a plain text message via Meta Cloud API.
   */
  async sendText(dto: SendTextMessageDto): Promise<WaApiResponse> {
    this.logger.log(`[WhatsApp API] Sending text to ${dto.to}`);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
      type: 'text',
      text: { preview_url: false, body: dto.text },
    };

    try {
      const { data } = await this.http.post<WaApiResponse>(
        `/${this.phoneNumberId}/messages`,
        payload,
      );
      this.logger.log(`[WhatsApp API] ✅ Sent → message id: ${data.messages?.[0]?.id}`);
      return data;
    } catch (err: any) {
      const errData = err.response?.data;
      this.logger.error(
        `[WhatsApp API] ❌ Send failed: ${JSON.stringify(errData ?? err.message)}`,
      );
      throw new Error(errData?.error?.message ?? err.message);
    }
  }

  /**
   * Send a template message (required for first outbound messages on Cloud API).
   */
  async sendTemplate(dto: SendTemplateMessageDto): Promise<WaApiResponse> {
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
      const { data } = await this.http.post<WaApiResponse>(
        `/${this.phoneNumberId}/messages`,
        payload,
      );
      this.logger.log(`[WhatsApp API] ✅ Template sent → ${data.messages?.[0]?.id}`);
      return data;
    } catch (err: any) {
      const errData = err.response?.data;
      this.logger.error(
        `[WhatsApp API] ❌ Template failed: ${JSON.stringify(errData ?? err.message)}`,
      );
      throw new Error(errData?.error?.message ?? err.message);
    }
  }

  /**
   * Get phone number details (verifies credentials).
   */
  async getPhoneNumberInfo(): Promise<object> {
    const { data } = await this.http.get(`/${this.phoneNumberId}?fields=display_phone_number,verified_name`);
    return data;
  }
}
