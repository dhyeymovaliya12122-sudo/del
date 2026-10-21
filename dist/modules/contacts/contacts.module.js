"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const contact_group_entity_1 = require("./entities/contact-group.entity");
const contact_group_member_entity_1 = require("./entities/contact-group-member.entity");
const conversation_memory_entity_1 = require("../chatbot/entities/conversation-memory.entity");
const campaign_recipient_entity_1 = require("../campaigns/entities/campaign-recipient.entity");
const contacts_service_1 = require("./services/contacts.service");
const contact_scorer_service_1 = require("./services/contact-scorer.service");
const contacts_controller_1 = require("./controllers/contacts.controller");
let ContactsModule = class ContactsModule {
};
exports.ContactsModule = ContactsModule;
exports.ContactsModule = ContactsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                contact_group_entity_1.ContactGroupEntity,
                contact_group_member_entity_1.ContactGroupMemberEntity,
                conversation_memory_entity_1.ConversationMemoryEntity,
                campaign_recipient_entity_1.CampaignRecipientEntity,
            ]),
        ],
        controllers: [contacts_controller_1.ContactsController],
        providers: [contacts_service_1.ContactsService, contact_scorer_service_1.ContactScorerService],
        exports: [contacts_service_1.ContactsService, contact_scorer_service_1.ContactScorerService],
    })
], ContactsModule);
//# sourceMappingURL=contacts.module.js.map