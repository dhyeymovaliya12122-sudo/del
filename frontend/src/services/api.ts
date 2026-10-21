/**
 * api.ts
 * Backward-compatible facade re-exporting domain modules from ./api/index.
 * Adheres to Commandment #10 (Scalable API structure).
 */
export * from './api/index';
export { api as default } from './api/index';
