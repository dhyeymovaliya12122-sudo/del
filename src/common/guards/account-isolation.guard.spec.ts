import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AccountIsolationGuard } from './account-isolation.guard';

describe('AccountIsolationGuard', () => {
  let guard: AccountIsolationGuard;
  let jwtService: any;
  let accountRepo: any;
  let accessRepo: any;

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    accountRepo = { findOne: jest.fn() };
    accessRepo = { findOne: jest.fn() };

    guard = new AccountIsolationGuard(jwtService, accountRepo, accessRepo);
  });

  const createMockContext = (requestData: any) => ({
    switchToHttp: () => ({
      getRequest: () => requestData,
    }),
  } as any);

  it('should throw BadRequestException if accountId is missing', async () => {
    const context = createMockContext({
      query: {},
      params: {},
      body: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(context)).rejects.toThrow('accountId is required');
  });

  it('should allow SUPER_ADMIN for universal "all" account stream', async () => {
    const context = createMockContext({
      query: { accountId: 'all' },
      user: { sub: 'admin-1', role: 'SUPER_ADMIN' },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should reject non-SUPER_ADMIN for universal "all" account stream', async () => {
    const context = createMockContext({
      query: { accountId: 'all' },
      user: { sub: 'user-1', role: 'ADMIN' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if account does not exist in database', async () => {
    accountRepo.findOne.mockResolvedValue(null);

    const context = createMockContext({
      query: { accountId: 'acc-nonexistent' },
      user: { sub: 'admin-1', role: 'SUPER_ADMIN' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(context)).rejects.toThrow('does not exist');
  });

  it('should allow SUPER_ADMIN to access any valid existing account', async () => {
    accountRepo.findOne.mockResolvedValue({ id: 'acc-1', name: 'Sales Account' });

    const context = createMockContext({
      query: { accountId: 'acc-1' },
      user: { sub: 'super-1', role: 'SUPER_ADMIN' },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(accessRepo.findOne).not.toHaveBeenCalled();
  });

  it('should allow non-SUPER_ADMIN user if access record exists', async () => {
    accountRepo.findOne.mockResolvedValue({ id: 'acc-1', name: 'Assigned Account' });
    accessRepo.findOne.mockResolvedValue({ id: 'access-1', userId: 'user-1', accountId: 'acc-1' });

    const context = createMockContext({
      query: { accountId: 'acc-1' },
      user: { sub: 'user-1', role: 'ADMIN' },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(accessRepo.findOne).toHaveBeenCalledWith({
      where: { accountId: 'acc-1', userId: 'user-1' },
    });
  });

  it('should throw ForbiddenException if non-SUPER_ADMIN user has no access record', async () => {
    accountRepo.findOne.mockResolvedValue({ id: 'acc-2', name: 'Restricted Account' });
    accessRepo.findOne.mockResolvedValue(null);

    const context = createMockContext({
      query: { accountId: 'acc-2' },
      user: { sub: 'user-1', role: 'ADMIN' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('You do not have permission to access account');
  });

  it('should extract accountId from route params if query param is absent', async () => {
    accountRepo.findOne.mockResolvedValue({ id: 'acc-route-1' });

    const context = createMockContext({
      query: {},
      params: { accountId: 'acc-route-1' },
      user: { sub: 'super-1', role: 'SUPER_ADMIN' },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(accountRepo.findOne).toHaveBeenCalledWith({ where: { id: 'acc-route-1' } });
  });
});
