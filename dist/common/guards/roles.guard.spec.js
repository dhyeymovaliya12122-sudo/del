"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("./roles.guard");
const app_user_entity_1 = require("../../modules/auth/entities/app-user.entity");
describe('RolesGuard', () => {
    let guard;
    let reflector;
    beforeEach(() => {
        reflector = {
            getAllAndOverride: jest.fn(),
        };
        guard = new roles_guard_1.RolesGuard(reflector);
    });
    const createMockContext = (user) => ({
        switchToHttp: () => ({
            getRequest: () => ({ user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
    });
    it('should allow access when no roles are required', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockContext({ role: app_user_entity_1.UserRole.ADMIN });
        expect(guard.canActivate(context)).toBe(true);
    });
    it('should allow access when user has the required role', () => {
        reflector.getAllAndOverride.mockReturnValue([app_user_entity_1.UserRole.SUPER_ADMIN]);
        const context = createMockContext({ role: app_user_entity_1.UserRole.SUPER_ADMIN });
        expect(guard.canActivate(context)).toBe(true);
    });
    it('should throw ForbiddenException when user lacks the required role', () => {
        reflector.getAllAndOverride.mockReturnValue([app_user_entity_1.UserRole.SUPER_ADMIN]);
        const context = createMockContext({ role: app_user_entity_1.UserRole.ADMIN });
        expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
    });
    it('should throw ForbiddenException when user context is missing', () => {
        reflector.getAllAndOverride.mockReturnValue([app_user_entity_1.UserRole.SUPER_ADMIN]);
        const context = createMockContext(null);
        expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
    });
});
//# sourceMappingURL=roles.guard.spec.js.map