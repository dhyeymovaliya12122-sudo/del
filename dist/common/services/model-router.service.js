"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRouterService = void 0;
const common_1 = require("@nestjs/common");
const ROUTER = {
    intent_classify: { model: 'gpt-4o-mini', maxTokens: 220, temperature: 0 },
    slot_extract: { model: 'gpt-4o-mini', maxTokens: 100, temperature: 0 },
    memory_summarise: { model: 'gpt-4o-mini', maxTokens: 250, temperature: 0.2 },
    injection_check: { model: 'gpt-4o-mini', maxTokens: 50, temperature: 0 },
    campaign_segment: { model: 'gpt-4o-mini', maxTokens: 500, temperature: 0.2 },
    hyde_generate: { model: 'gpt-4o-mini', maxTokens: 180, temperature: 0.3 },
    faq_answer: { model: 'gpt-4o', maxTokens: 130, temperature: 0.1 },
    escalation_handoff: { model: 'gpt-4o', maxTokens: 400, temperature: 0.3 },
};
const NON_LATIN_SCRIPT = /[\u0900-\u097F\u0600-\u06FF\u4E00-\u9FFF\u0980-\u09FF]/;
let ModelRouterService = class ModelRouterService {
    route(task, inputText) {
        const base = ROUTER[task];
        if (inputText && NON_LATIN_SCRIPT.test(inputText)) {
            return { ...base, model: 'gpt-4o' };
        }
        return base;
    }
    model(task, inputText) {
        return this.route(task, inputText).model;
    }
};
exports.ModelRouterService = ModelRouterService;
exports.ModelRouterService = ModelRouterService = __decorate([
    (0, common_1.Injectable)()
], ModelRouterService);
//# sourceMappingURL=model-router.service.js.map