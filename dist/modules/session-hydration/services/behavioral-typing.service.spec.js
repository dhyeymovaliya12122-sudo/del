"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const behavioral_typing_service_1 = require("./behavioral-typing.service");
describe('BehavioralTypingService (AI Anti-Ban Cadence Simulator)', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [behavioral_typing_service_1.BehavioralTypingService],
        }).compile();
        service = module.get(behavioral_typing_service_1.BehavioralTypingService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should generate Gaussian samples within reasonable bounds', () => {
        const samples = Array.from({ length: 50 }, () => service.sampleGaussian(55, 10));
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        expect(avg).toBeGreaterThan(40);
        expect(avg).toBeLessThan(70);
    });
    it('should skip simulation if disabled or text is empty', async () => {
        const mockSocket = { sendPresenceUpdate: jest.fn() };
        await service.simulateHumanDispatch(mockSocket, 'test@s.whatsapp.net', '', { enabled: false });
        expect(mockSocket.sendPresenceUpdate).not.toHaveBeenCalled();
        await service.simulateHumanDispatch(mockSocket, 'test@s.whatsapp.net', '   ', { enabled: true });
        expect(mockSocket.sendPresenceUpdate).not.toHaveBeenCalled();
    });
    it('should send composing and paused presence updates for normal text', async () => {
        const mockSocket = { sendPresenceUpdate: jest.fn().mockResolvedValue({}) };
        await service.simulateHumanDispatch(mockSocket, 'user@s.whatsapp.net', 'Hello from automated Anti-Ban!', { maxTypingDurationMs: 100 });
        expect(mockSocket.sendPresenceUpdate).toHaveBeenCalledWith('composing', 'user@s.whatsapp.net');
        expect(mockSocket.sendPresenceUpdate).toHaveBeenCalledWith('paused', 'user@s.whatsapp.net');
    });
    it('should gracefully handle socket error in presence update without throwing', async () => {
        const mockSocket = {
            sendPresenceUpdate: jest.fn().mockRejectedValue(new Error('Socket disconnected')),
        };
        await expect(service.simulateHumanDispatch(mockSocket, 'user@s.whatsapp.net', 'Testing error resiliency', {
            maxTypingDurationMs: 50,
        })).resolves.not.toThrow();
    });
});
//# sourceMappingURL=behavioral-typing.service.spec.js.map