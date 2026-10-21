import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../entities/app-user.entity';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let accessRepo: any;
  let accountRepo: any;
  let resetRepo: any;
  let jwtService: any;

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };
    accessRepo = {
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    accountRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    resetRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    service = new AuthService(
      userRepo,
      accessRepo,
      accountRepo,
      resetRepo,
      jwtService,
    );
  });

  describe('login', () => {
    it('should throw UnauthorizedException if username or password is missing', async () => {
      await expect(service.login('', 'password123')).rejects.toThrow(UnauthorizedException);
      await expect(service.login('admin', '')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepo.createQueryBuilder.mockReturnValue(qbMock);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login('unknown_user', 'password123')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const passwordHash = await bcrypt.hash('correct_password', 10);
      const mockUser = {
        id: 'user-1',
        username: 'testadmin',
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      };

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepo.createQueryBuilder.mockReturnValue(qbMock);

      await expect(service.login('testadmin', 'wrong_password')).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user profile on successful login', async () => {
      const passwordHash = await bcrypt.hash('correct_password', 10);
      const mockUser = {
        id: 'super-1',
        username: 'superadmin',
        displayName: 'Super Admin',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      };

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepo.createQueryBuilder.mockReturnValue(qbMock);
      jwtService.sign.mockReturnValue('mock.jwt.token');
      accountRepo.find.mockResolvedValue([{ id: 'acc-1' }, { id: 'acc-2' }]);

      const result = await service.login('superadmin', 'correct_password');

      expect(result).toHaveProperty('token', 'mock.jwt.token');
      expect(result.user).toEqual({
        id: 'super-1',
        username: 'superadmin',
        displayName: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
        accountIds: ['acc-1', 'acc-2'],
      });
    });
  });
});
