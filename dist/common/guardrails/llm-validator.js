"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAFE_FALLBACK_MSG = void 0;
exports.validateLLM = validateLLM;
exports.isSafeContent = isSafeContent;
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('LLMValidator');
function validateLLM(schema, raw, fallback, context = 'unknown') {
    if (!raw) {
        logger.warn(`[Guardrail:${context}] Empty LLM output — using fallback`);
        return fallback;
    }
    try {
        return schema.parse(JSON.parse(raw));
    }
    catch (err) {
        logger.warn(`[Guardrail:${context}] Schema validation failed: ${err.message?.slice(0, 120)}`);
        return fallback;
    }
}
const BLOCKED_PATTERNS = [
    /guaranteed refund/i,
    /100% (free|discount|off)/i,
    /call (\+?\d{8,})/i,
    /visit us at http/i,
];
function isSafeContent(text) {
    return !BLOCKED_PATTERNS.some(p => p.test(text));
}
exports.SAFE_FALLBACK_MSG = "I'll connect you with our team for more details on that.";
//# sourceMappingURL=llm-validator.js.map