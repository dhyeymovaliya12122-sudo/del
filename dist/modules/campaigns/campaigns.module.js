"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const campaign_entity_1 = require("./entities/campaign.entity");
const campaign_recipient_entity_1 = require("./entities/campaign-recipient.entity");
const whatsapp_contact_entity_1 = require("../session-hydration/entities/whatsapp-contact.entity");
const campaigns_service_1 = require("./services/campaigns.service");
const campaigns_controller_1 = require("./controllers/campaigns.controller");
const message_queue_module_1 = require("../message-queue/message-queue.module");
const session_hydration_module_1 = require("../session-hydration/session-hydration.module");
let CampaignsModule = class CampaignsModule {
};
exports.CampaignsModule = CampaignsModule;
exports.CampaignsModule = CampaignsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([campaign_entity_1.CampaignEntity, campaign_recipient_entity_1.CampaignRecipientEntity, whatsapp_contact_entity_1.WhatsappContactEntity]),
            message_queue_module_1.MessageQueueModule,
            session_hydration_module_1.SessionHydrationModule,
        ],
        controllers: [campaigns_controller_1.CampaignsController],
        providers: [campaigns_service_1.CampaignsService],
        exports: [campaigns_service_1.CampaignsService],
    })
], CampaignsModule);
//# sourceMappingURL=campaigns.module.js.map