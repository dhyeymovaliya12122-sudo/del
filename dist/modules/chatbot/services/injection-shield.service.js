"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var InjectionShieldService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectionShieldService = void 0;
const common_1 = require("@nestjs/common");
let InjectionShieldService = InjectionShieldService_1 = class InjectionShieldService {
    constructor() {
        this.logger = new common_1.Logger(InjectionShieldService_1.name);
        this.INJECTION_PATTERNS = [
            /ignore (all |previous |prior )?instructions/i,
            /you are now (dan|jailbreak|dev mode|an? ai without)/i,
            /repeat (after me|the following)[:\s]/i,
            /disregard (your |the )?system prompt/i,
            /act as (an? )?(unrestricted|uncensored|unfiltered)/i,
            /\bsystem prompt\b/i,
            /\bjailbreak\b/i,
            /forget (all )?previous (instructions|context)/i,
            /pretend (you are|to be) (a |an )?/i,
            /new persona:/i,
        ];
        this.DELIMITER_PATTERN = /\[INST\]|\[\/INST\]|<s>|<\/s>|###\s*(system|assistant|user)\b/gi;
        this.MAX_INPUT_LENGTH = 1000;
    }
    sanitize(text) {
        if (text.length > this.MAX_INPUT_LENGTH) {
            this.logger.debug(`[Shield] Input too long: ${text.length} chars`);
            return { safe: false, sanitized: '', reason: 'input_too_long' };
        }
        for (const pattern of this.INJECTION_PATTERNS) {
            if (pattern.test(text)) {
                this.logger.debug(`[Shield] Injection detected: ${pattern.source.slice(0, 40)}`);
                return {
                    safe: false,
                    sanitized: '',
                    reason: `injection:${pattern.source.slice(0, 40)}`,
                };
            }
        }
        const sanitized = text.replace(this.DELIMITER_PATTERN, '').trim();
        return { safe: true, sanitized };
    }
};
exports.InjectionShieldService = InjectionShieldService;
exports.InjectionShieldService = InjectionShieldService = InjectionShieldService_1 = __decorate([
    (0, common_1.Injectable)()
], InjectionShieldService);
//# sourceMappingURL=injection-shield.service.js.map