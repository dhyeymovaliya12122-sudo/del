"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const account_warmup_service_1 = require("./account-warmup.service");
const whatsapp_account_entity_1 = require("../entities/whatsapp-account.entity");
const typeorm_1 = require("@nestjs/typeorm");
describe('AccountWarmupService (Logarithmic Progression Curve)', () => {
    let service;
    let mockAccountRepo;
    beforeEach(async () => {
        mockAccountRepo = {
            findOne: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                account_warmup_service_1.AccountWarmupService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(whatsapp_account_entity_1.WhatsappAccountEntity),
                    useValue: mockAccountRepo,
                },
            ],
        }).compile();
        service = module.get(account_warmup_service_1.AccountWarmupService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('computeDailyThreshold', () => {
        it('should assign Day 1 cold threshold of 15 msgs', () => {
            expect(service.computeDailyThreshold(1)).toBe(15);
        });
        it('should assign Day 3 trust-building threshold of 45 msgs', () => {
            expect(service.computeDailyThreshold(3)).toBe(45);
        });
        it('should scale to 150 msgs on Day 7', () => {
            expect(service.computeDailyThreshold(7)).toBe(150);
        });
        it('should scale to 1000+ msgs on Day 14+', () => {
            expect(service.computeDailyThreshold(14)).toBeGreaterThanOrEqual(1000);
            expect(service.computeDailyThreshold(30)).toBe(1500);
        });
    });
    describe('canDispatch and recordDispatch', () => {
        it('should enforce daily limit for cold account (15 msgs)', async () => {
            mockAccountRepo.findOne.mockResolvedValue({
                id: 'acc-cold-1',
                phoneNumber: '919876543210',
                createdAt: new Date(),
            });
            for (let i = 0; i < 14; i++) {
                const check = await service.canDispatch('acc-cold-1');
                expect(check.allowed).toBe(true);
                service.recordDispatch('acc-cold-1');
            }
            const check15 = await service.canDispatch('acc-cold-1');
            expect(check15.allowed).toBe(true);
            service.recordDispatch('acc-cold-1');
            const check16 = await service.canDispatch('acc-cold-1');
            expect(check16.allowed).toBe(false);
            expect(check16.reason).toContain('Account daily warm-up limit reached (15/15 msgs)');
        });
        it('should return accurate warmup profile metrics', async () => {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            mockAccountRepo.findOne.mockResolvedValue({
                id: 'acc-warm-10',
                phoneNumber: '919123456789',
                createdAt: tenDaysAgo,
            });
            const profile = await service.getWarmupProfile('acc-warm-10');
            expect(profile.daysConnected).toBeGreaterThanOrEqual(10);
            expect(profile.tier).toBe('WARM');
            expect(profile.dailyThreshold).toBeGreaterThan(150);
            expect(profile.isThrottled).toBe(false);
            expect(profile.healthScore).toBeGreaterThanOrEqual(80);
        });
    });
});
//# sourceMappingURL=account-warmup.service.spec.js.map