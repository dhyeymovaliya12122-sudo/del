"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contact_resolver_util_1 = require("./contact-resolver.util");
describe('contact-resolver.util', () => {
    describe('isLidIdentifier', () => {
        it('should identify valid LID numbers (14-16 digits)', () => {
            expect((0, contact_resolver_util_1.isLidIdentifier)('255086932549720')).toBe(true);
            expect((0, contact_resolver_util_1.isLidIdentifier)('255086932549720@lid')).toBe(true);
        });
        it('should return false for regular phone numbers or short IDs', () => {
            expect((0, contact_resolver_util_1.isLidIdentifier)('919876543210')).toBe(false);
            expect((0, contact_resolver_util_1.isLidIdentifier)('12345')).toBe(false);
            expect((0, contact_resolver_util_1.isLidIdentifier)(null)).toBe(false);
            expect((0, contact_resolver_util_1.isLidIdentifier)(undefined)).toBe(false);
        });
    });
    describe('isGroupJid', () => {
        it('should recognize group JIDs ending in @g.us', () => {
            expect((0, contact_resolver_util_1.isGroupJid)('120363407791015930@g.us')).toBe(true);
            expect((0, contact_resolver_util_1.isGroupJid)('120363407791015930')).toBe(true);
        });
        it('should return false for individual user JIDs', () => {
            expect((0, contact_resolver_util_1.isGroupJid)('919876543210@s.whatsapp.net')).toBe(false);
            expect((0, contact_resolver_util_1.isGroupJid)('255086932549720@lid')).toBe(false);
        });
    });
    describe('cleanSenderJid', () => {
        it('should strip device suffix (:0, :1) from JIDs', () => {
            expect((0, contact_resolver_util_1.cleanSenderJid)('919876543210:4@s.whatsapp.net')).toBe('919876543210@s.whatsapp.net');
            expect((0, contact_resolver_util_1.cleanSenderJid)('255086932549720:0@lid')).toBe('255086932549720@lid');
        });
        it('should handle clean JIDs without devices', () => {
            expect((0, contact_resolver_util_1.cleanSenderJid)('919876543210@s.whatsapp.net')).toBe('919876543210@s.whatsapp.net');
        });
    });
    describe('formatE164', () => {
        it('should format 12-digit Indian numbers with +91', () => {
            expect((0, contact_resolver_util_1.formatE164)('919876543210')).toBe('+91 98765 43210');
        });
        it('should format 10-digit Indian numbers starting with 6-9 with +91', () => {
            expect((0, contact_resolver_util_1.formatE164)('9876543210')).toBe('+91 98765 43210');
        });
        it('should return original cleaned string if already prefixed with +', () => {
            expect((0, contact_resolver_util_1.formatE164)('+14155552671')).toBe('+14155552671');
        });
        it('should return empty string for null/undefined/empty input', () => {
            expect((0, contact_resolver_util_1.formatE164)('')).toBe('');
            expect((0, contact_resolver_util_1.formatE164)(null)).toBe('');
            expect((0, contact_resolver_util_1.formatE164)(undefined)).toBe('');
        });
    });
    describe('resolveContactInfo', () => {
        it('should resolve group conversations properly', () => {
            const res = (0, contact_resolver_util_1.resolveContactInfo)('120363407791015930@g.us', 'Sales Team');
            expect(res.isGroup).toBe(true);
            expect(res.name).toBe('Sales Team');
            expect(res.chatType).toBe('Group');
        });
        it('should fallback to WhatsApp Group when raw group JID is passed as name', () => {
            const res = (0, contact_resolver_util_1.resolveContactInfo)('120363407791015930@g.us', '120363407791015930@g.us');
            expect(res.isGroup).toBe(true);
            expect(res.name).toBe('WhatsApp Group');
        });
        it('should resolve direct contact with human name and formatted phone', () => {
            const res = (0, contact_resolver_util_1.resolveContactInfo)('919876543210@s.whatsapp.net', 'John Doe');
            expect(res.isGroup).toBe(false);
            expect(res.name).toBe('John Doe');
            expect(res.displayPhone).toBe('+91 98765 43210');
            expect(res.chatType).toBe('Direct Chat');
        });
        it('should NOT treat other contacts as self when activeAccountPhone is empty', () => {
            const res = (0, contact_resolver_util_1.resolveContactInfo)('919876543210@s.whatsapp.net', null, null, null, false, '');
            expect(res.name).toBe('+91 98765 43210');
            expect(res.name).not.toBe('You (Message yourself)');
            expect(res.name).not.toBe('Direct Chat');
        });
        it('should reject placeholder name and use notifyName', () => {
            const res = (0, contact_resolver_util_1.resolveContactInfo)('169707093131322@lid', 'You (Message yourself)', null, 'Mr. Aadil Thim');
            expect(res.name).toBe('Mr. Aadil Thim');
        });
        it('should correctly identify self chat only when matching active account phone', () => {
            const res = (0, contact_resolver_util_1.resolveContactInfo)('919081236708@s.whatsapp.net', null, null, null, false, '+919081236708');
            expect(res.name).toBe('You (Message yourself)');
            expect(res.chatType).toBe('Self');
        });
    });
});
//# sourceMappingURL=contact-resolver.util.spec.js.map