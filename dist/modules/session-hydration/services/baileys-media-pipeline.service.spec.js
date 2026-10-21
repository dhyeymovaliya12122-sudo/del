"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('baileys', () => ({
    __esModule: true,
    default: jest.fn(),
    downloadMediaMessage: jest.fn(),
    useMultiFileAuthState: jest.fn(),
}));
const baileys_media_pipeline_service_1 = require("./baileys-media-pipeline.service");
describe('BaileysMediaPipelineService', () => {
    let service;
    let messageRepo;
    beforeEach(() => {
        messageRepo = {
            createQueryBuilder: jest.fn(),
            update: jest.fn(),
        };
        service = new baileys_media_pipeline_service_1.BaileysMediaPipelineService(messageRepo);
    });
    describe('resolveExtension', () => {
        it('should map jpeg/jpg mime types to jpg', () => {
            expect(service.resolveExtension('image/jpeg')).toBe('jpg');
            expect(service.resolveExtension('image/jpg')).toBe('jpg');
        });
        it('should map png, webp, and mp4 correctly', () => {
            expect(service.resolveExtension('image/png')).toBe('png');
            expect(service.resolveExtension('image/webp')).toBe('webp');
            expect(service.resolveExtension('video/mp4')).toBe('mp4');
        });
        it('should map ogg, opus, and mp3 audio correctly', () => {
            expect(service.resolveExtension('audio/ogg; codecs=opus')).toBe('ogg');
            expect(service.resolveExtension('audio/opus')).toBe('ogg');
            expect(service.resolveExtension('audio/mpeg')).toBe('mp3');
        });
        it('should extract extension from fileName if mime type is generic', () => {
            expect(service.resolveExtension('application/octet-stream', 'report.pdf')).toBe('pdf');
            expect(service.resolveExtension('application/octet-stream', 'data.xlsx')).toBe('xlsx');
        });
        it('should fallback to mediaType category if mime and fileName are unknown', () => {
            expect(service.resolveExtension(undefined, undefined, 'image')).toBe('jpg');
            expect(service.resolveExtension(undefined, undefined, 'video')).toBe('mp4');
            expect(service.resolveExtension(undefined, undefined, 'audio')).toBe('ogg');
            expect(service.resolveExtension(undefined, undefined, 'custom')).toBe('bin');
        });
    });
});
//# sourceMappingURL=baileys-media-pipeline.service.spec.js.map