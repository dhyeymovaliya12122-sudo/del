"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeEscapeRegex = safeEscapeRegex;
exports.safeRegexTest = safeRegexTest;
exports.safeInterpolate = safeInterpolate;
const CATASTROPHIC_QUANTIFIER_REGEX = /(\([^\)]*[\+\*]\)[^\)]*[\+\*])|(\([^\)]*\{\d+,\}[^\)]*[\+\*])/;
function safeEscapeRegex(str) {
    if (!str || typeof str !== 'string')
        return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function safeRegexTest(pattern, text, maxTextLength = 1000, maxPatternLength = 120) {
    if (!pattern || typeof pattern !== 'string' || !text || typeof text !== 'string') {
        return false;
    }
    if (pattern.length > maxPatternLength) {
        return false;
    }
    if (CATASTROPHIC_QUANTIFIER_REGEX.test(pattern)) {
        return false;
    }
    const boundedText = text.slice(0, maxTextLength);
    try {
        const re = new RegExp(pattern, 'i');
        return re.test(boundedText);
    }
    catch {
        return false;
    }
}
function safeInterpolate(text, variables) {
    if (!text || typeof text !== 'string')
        return '';
    if (!variables || typeof variables !== 'object')
        return text;
    let result = text;
    for (const [key, val] of Object.entries(variables)) {
        if (!key || typeof key !== 'string')
            continue;
        const token = `{${key}}`;
        const cleanVal = val !== null && val !== undefined ? String(val) : '';
        result = result.split(token).join(cleanVal);
    }
    return result;
}
//# sourceMappingURL=safe-regex.util.js.map