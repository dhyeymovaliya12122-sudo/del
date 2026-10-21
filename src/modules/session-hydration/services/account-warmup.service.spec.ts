// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/services/account-warmup.service.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Test, TestingModule } from '@nestjs/testing';
import { AccountWarmupService } from './account-warmup.service';
import { WhatsappAccountEntity } from '../entities/whatsapp-account.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('AccountWarmupService (Logarithmic Progression Curve)', () => {
  let service: AccountWarmupService;
  let mockAccountRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    mockAccountRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountWarmupService,
        {
          provide: getRepositoryToken(WhatsappAccountEntity),
          useValue: mockAccountRepo,
        },
      ],
    }).compile();

    service = module.get<AccountWarmupService>(AccountWarmupService);
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
      // Setup Day 1 account
      mockAccountRepo.findOne.mockResolvedValue({
        id: 'acc-cold-1',
        phoneNumber: '919876543210',
        createdAt: new Date(),
      });

      // Send 14 messages -> all allowed
      for (let i = 0; i < 14; i++) {
        const check = await service.canDispatch('acc-cold-1');
        expect(check.allowed).toBe(true);
        service.recordDispatch('acc-cold-1');
      }

      // 15th message -> allowed
      const check15 = await service.canDispatch('acc-cold-1');
      expect(check15.allowed).toBe(true);
      service.recordDispatch('acc-cold-1');

      // 16th message -> throttled!
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
