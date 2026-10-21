"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
describe('JwtAuthGuard', () => {
    let guard;
    let jwtService;
    let reflector;
    beforeEach(() => {
        jwtService = {
            verify: jest.fn(),
        };
        reflector = {
            getAllAndOverride: jest.fn(),
        };
        guard = new jwt_auth_guard_1.JwtAuthGuard(jwtService, reflector);
    });
    const createMockContext = (req) => ({
        switchToHttp: () => ({
            getRequest: () => req,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
    });
    it('should allow public routes without token verification', () => {
        reflector.getAllAndOverride.mockReturnValue(true);
        const context = createMockContext({
            headers: {},
            url: '/api/v1/auth/login',
        });
        expect(guard.canActivate(context)).toBe(true);
        expect(jwtService.verify).not.toHaveBeenCalled();
    });
    it('should verify and allow request with valid Bearer token in Authorization header', () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const mockUser = { sub: 'user-1', username: 'admin', role: 'SUPER_ADMIN' };
        jwtService.verify.mockReturnValue(mockUser);
        const req = {
            headers: { authorization: 'Bearer valid.jwt.token' },
            url: '/api/v1/accounts',
        };
        const context = createMockContext(req);
        expect(guard.canActivate(context)).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token');
        expect(req.user).toEqual(mockUser);
    });
    it('should extract and verify token from query parameter', () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const mockUser = { sub: 'user-2', username: 'viewer', role: 'ADMIN' };
        jwtService.verify.mockReturnValue(mockUser);
        const req = {
            headers: {},
            query: { token: 'query.jwt.token' },
            url: '/api/v1/whatsapp/media/acc1/photo.jpg',
        };
        const context = createMockContext(req);
        expect(guard.canActivate(context)).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith('query.jwt.token');
        expect(req.user).toEqual(mockUser);
    });
    it('should extract and verify token from cookie', () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const mockUser = { sub: 'user-3', username: 'cookier', role: 'ADMIN' };
        jwtService.verify.mockReturnValue(mockUser);
        const req = {
            headers: {},
            cookies: { wa_token: 'cookie.jwt.token' },
            url: '/api/v1/whatsapp/chats',
        };
        const context = createMockContext(req);
        expect(guard.canActivate(context)).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith('cookie.jwt.token');
        expect(req.user).toEqual(mockUser);
    });
    it('should throw UnauthorizedException when no token is provided', () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const req = {
            headers: {},
            url: '/api/v1/whatsapp/chats',
        };
        const context = createMockContext(req);
        expect(() => guard.canActivate(context)).toThrow(common_1.UnauthorizedException);
        expect(() => guard.canActivate(context)).toThrow('Missing Authorization header or token query parameter');
    });
    it('should throw UnauthorizedException when token verification fails', () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        jwtService.verify.mockImplementation(() => {
            throw new Error('jwt expired');
        });
        const req = {
            headers: { authorization: 'Bearer expired.token' },
            url: '/api/v1/whatsapp/chats',
        };
        const context = createMockContext(req);
        expect(() => guard.canActivate(context)).toThrow(common_1.UnauthorizedException);
        expect(() => guard.canActivate(context)).toThrow('Invalid or expired token');
    });
});
//# sourceMappingURL=jwt-auth.guard.spec.js.map