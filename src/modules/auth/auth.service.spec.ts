import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn().mockResolvedValue(true),
}));
import { UsersService } from '../users/users.service';

const mockUser = {
  id: 'user-id-1',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed-password',
  role: 'USER',
  isActive: true,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateRefreshToken: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('mock-secret'),
};

describe('AuthService', () => {
  let service: AuthService;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowRegistration = process.env.ALLOW_REGISTRATION;

  beforeEach(async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_REGISTRATION;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAllowRegistration === undefined) {
      delete process.env.ALLOW_REGISTRATION;
    } else {
      process.env.ALLOW_REGISTRATION = originalAllowRegistration;
    }
  });

  describe('register', () => {
    it('lança ConflictException se email já existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: mockUser.email, password: 'senha123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('cria usuário e retorna tokens quando email é novo', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.register({
        email: mockUser.email,
        password: 'senha123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
    });

    it('lança ForbiddenException em produção sem ALLOW_REGISTRATION=true', async () => {
      process.env.NODE_ENV = 'production';

      await expect(
        service.register({ email: mockUser.email, password: 'senha123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite registro em produção com ALLOW_REGISTRATION=true', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_REGISTRATION = 'true';
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.register({
        email: mockUser.email,
        password: 'senha123',
      });

      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('login', () => {
    it('lança UnauthorizedException se usuário não existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nao@existe.com', password: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException se senha incorreta', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      const { compare } = jest.requireMock<{ compare: jest.Mock }>('bcrypt');
      compare.mockResolvedValueOnce(false);

      await expect(
        service.login({ email: mockUser.email, password: 'errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('remove o refresh token do banco', async () => {
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      await service.logout('user-id-1');

      expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-id-1',
        null,
      );
    });
  });

  describe('getMe', () => {
    it('retorna perfil sem campos sensíveis', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.getMe('user-id-1');

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('email');
    });

    it('lança UnauthorizedException se usuário não existe', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.getMe('id-inexistente')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
