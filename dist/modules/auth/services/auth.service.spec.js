"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const app_user_entity_1 = require("../entities/app-user.entity");
const bcrypt = require("bcryptjs");
describe('AuthService', () => {
    let service;
    let userRepo;
    let accessRepo;
    let accountRepo;
    let resetRepo;
    let jwtService;
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
        service = new auth_service_1.AuthService(userRepo, accessRepo, accountRepo, resetRepo, jwtService);
    });
    describe('login', () => {
        it('should throw UnauthorizedException if username or password is missing', async () => {
            await expect(service.login('', 'password123')).rejects.toThrow(common_1.UnauthorizedException);
            await expect(service.login('admin', '')).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException if user is not found', async () => {
            const qbMock = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };
            userRepo.createQueryBuilder.mockReturnValue(qbMock);
            userRepo.findOne.mockResolvedValue(null);
            await expect(service.login('unknown_user', 'password123')).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException if password does not match', async () => {
            const passwordHash = await bcrypt.hash('correct_password', 10);
            const mockUser = {
                id: 'user-1',
                username: 'testadmin',
                passwordHash,
                role: app_user_entity_1.UserRole.ADMIN,
                isActive: true,
            };
            const qbMock = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            };
            userRepo.createQueryBuilder.mockReturnValue(qbMock);
            await expect(service.login('testadmin', 'wrong_password')).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should return token and user profile on successful login', async () => {
            const passwordHash = await bcrypt.hash('correct_password', 10);
            const mockUser = {
                id: 'super-1',
                username: 'superadmin',
                displayName: 'Super Admin',
                passwordHash,
                role: app_user_entity_1.UserRole.SUPER_ADMIN,
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
                role: app_user_entity_1.UserRole.SUPER_ADMIN,
                accountIds: ['acc-1', 'acc-2'],
            });
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map