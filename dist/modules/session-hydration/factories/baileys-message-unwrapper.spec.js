"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('baileys', () => ({
    __esModule: true,
    default: jest.fn(),
    downloadMediaMessage: jest.fn(),
    useMultiFileAuthState: jest.fn(),
    DisconnectReason: {},
}));
jest.mock('../../realtime-gateway/services/realtime-event.service', () => ({
    RealtimeEventService: class {
    },
}));
const baileys_client_factory_1 = require("./baileys-client.factory");
describe('Baileys Message Protocol & Unwrapping', () => {
    describe('unwrapMessage', () => {
        it('should return null for null/undefined messages', () => {
            expect((0, baileys_client_factory_1.unwrapMessage)(null)).toBeNull();
            expect((0, baileys_client_factory_1.unwrapMessage)(undefined)).toBeNull();
        });
        it('should return plain text message as-is', () => {
            const msg = { conversation: 'Hello world' };
            expect((0, baileys_client_factory_1.unwrapMessage)(msg)).toEqual(msg);
        });
        it('should unwrap ephemeralMessage wrapper', () => {
            const msg = {
                ephemeralMessage: {
                    message: { conversation: 'Ephemeral text' },
                },
            };
            expect((0, baileys_client_factory_1.unwrapMessage)(msg)).toEqual({ conversation: 'Ephemeral text' });
        });
        it('should unwrap viewOnceMessage and viewOnceMessageV2 wrappers', () => {
            const v1 = {
                viewOnceMessage: {
                    message: { imageMessage: { url: 'https://example.com/img.jpg' } },
                },
            };
            expect((0, baileys_client_factory_1.unwrapMessage)(v1)).toEqual({ imageMessage: { url: 'https://example.com/img.jpg' } });
            const v2 = {
                viewOnceMessageV2: {
                    message: { videoMessage: { url: 'https://example.com/vid.mp4' } },
                },
            };
            expect((0, baileys_client_factory_1.unwrapMessage)(v2)).toEqual({ videoMessage: { url: 'https://example.com/vid.mp4' } });
        });
        it('should unwrap documentWithCaptionMessage wrapper', () => {
            const doc = {
                documentWithCaptionMessage: {
                    message: { documentMessage: { fileName: 'contract.pdf' } },
                },
            };
            expect((0, baileys_client_factory_1.unwrapMessage)(doc)).toEqual({ documentMessage: { fileName: 'contract.pdf' } });
        });
        it('should handle multi-layer nested wrappers (ephemeral + viewOnce)', () => {
            const nested = {
                ephemeralMessage: {
                    message: {
                        viewOnceMessage: {
                            message: { conversation: 'Deeply nested secret' },
                        },
                    },
                },
            };
            expect((0, baileys_client_factory_1.unwrapMessage)(nested)).toEqual({ conversation: 'Deeply nested secret' });
        });
    });
    describe('extractProtocolMessage', () => {
        it('should find top-level protocolMessage', () => {
            const pm = { type: 14, key: { id: 'msg-1' } };
            expect((0, baileys_client_factory_1.extractProtocolMessage)({ protocolMessage: pm })).toBe(pm);
        });
        it('should find protocolMessage inside message property', () => {
            const pm = { type: 0, key: { id: 'msg-revoke' } };
            expect((0, baileys_client_factory_1.extractProtocolMessage)({ message: { protocolMessage: pm } })).toBe(pm);
        });
        it('should return null if no protocol message exists', () => {
            expect((0, baileys_client_factory_1.extractProtocolMessage)({ conversation: 'Regular text' })).toBeNull();
        });
    });
    describe('extractDirectEditedContent', () => {
        it('should extract edit target and content for type 14 protocol messages', () => {
            const editMsg = {
                message: {
                    protocolMessage: {
                        type: 14,
                        key: { id: 'target-msg-123', remoteJid: '919876543210@s.whatsapp.net' },
                        editedMessage: { conversation: 'Updated edited text' },
                    },
                },
            };
            const result = (0, baileys_client_factory_1.extractDirectEditedContent)(editMsg);
            expect(result).not.toBeNull();
            expect(result?.targetId).toBe('target-msg-123');
            expect(result?.targetChat).toBe('919876543210@s.whatsapp.net');
            expect(result?.content).toEqual({ conversation: 'Updated edited text' });
        });
        it('should return null for regular unedited messages', () => {
            const regularMsg = {
                message: { conversation: 'Standard text' },
            };
            expect((0, baileys_client_factory_1.extractDirectEditedContent)(regularMsg)).toBeNull();
        });
    });
});
//# sourceMappingURL=baileys-message-unwrapper.spec.js.map