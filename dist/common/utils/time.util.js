"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
exports.delay = delay;
//# sourceMappingURL=time.util.js.map