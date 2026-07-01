import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

const mockJwtService = {
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('mock-secret'),
};

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const buildContext = (token?: string, isPublic = false): ExecutionContext => {
  mockReflector.getAllAndOverride.mockReturnValue(isPublic);

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          authorization: token ? `Bearer ${token}` : undefined,
        },
        user: undefined,
      }),
    }),
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
      mockReflector as unknown as Reflector,
    );
    jest.clearAllMocks();
  });

  it('permite acesso a rotas públicas sem token', async () => {
    const ctx = buildContext(undefined, true);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('lança UnauthorizedException se token ausente em rota privada', async () => {
    const ctx = buildContext(undefined, false);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException se token inválido', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
    const ctx = buildContext('token-invalido', false);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('anexa payload ao request quando token válido', async () => {
    const payload = { sub: 'id-1', email: 'a@b.com', role: 'USER' };
    mockJwtService.verifyAsync.mockResolvedValue(payload);
    mockReflector.getAllAndOverride.mockReturnValue(false);

    const request = {
      headers: { authorization: 'Bearer valid-token' },
      user: undefined,
    };
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await guard.canActivate(ctx);
    expect(request.user).toEqual(payload);
  });
});
