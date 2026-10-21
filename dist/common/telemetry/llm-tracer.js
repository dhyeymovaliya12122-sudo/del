"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskPii = void 0;
exports.wrapTrace = wrapTrace;
const maskPii = (s) => s
    .replace(/\+?\d{10,15}/g, '[PHONE]')
    .replace(/\b[A-Z][a-z]{1,15} [A-Z][a-z]{1,15}\b/g, '[NAME]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
exports.maskPii = maskPii;
async function wrapTrace(fn, name, metadata = {}) {
    if (!process.env.LANGSMITH_API_KEY) {
        return fn;
    }
    try {
        const wrappers = await Promise.resolve().then(() => require('langsmith/wrappers'));
        const traceable = wrappers.traceable ?? wrappers.default?.traceable;
        if (!traceable)
            return fn;
        return traceable(fn, {
            name,
            project_name: process.env.LANGSMITH_PROJECT ?? 'whatsapp-core-engine',
            tags: Object.entries(metadata).map(([k, v]) => `${k}:${v}`),
        });
    }
    catch {
        return fn;
    }
}
//# sourceMappingURL=llm-tracer.js.map