import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { WorkspaceService } from './workspace.service';

const workspaceId = 'ws-1';
const userId = 'user-1';
const membershipId = 'member-1';

const mockMembership = {
  id: membershipId,
  workspaceId,
  userId,
  role: WorkspaceRole.MEMBER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTx = {
  workspaceMember: {
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockPrisma = {
  workspaceMember: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
    fn(mockTx),
  ),
};

const mockUsersService = {};

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    jest.clearAllMocks();

    mockPrisma.workspaceMember.findUnique.mockResolvedValue(mockMembership);
    mockPrisma.workspaceMember.count.mockResolvedValue(2);
    mockTx.workspaceMember.delete.mockResolvedValue(mockMembership);
    mockTx.workspaceMember.count.mockResolvedValue(0);
    mockTx.user.findUnique.mockResolvedValue({ id: userId, role: 'USER' });
    mockTx.user.delete.mockResolvedValue({ id: userId });
  });

  describe('removeMember', () => {
    it('lança ForbiddenException se ator não é OWNER', async () => {
      await expect(
        service.removeMember(workspaceId, userId, WorkspaceRole.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('mantém conta quando usuário ainda tem outro workspace', async () => {
      mockTx.workspaceMember.count.mockResolvedValueOnce(1);

      const result = await service.removeMember(
        workspaceId,
        userId,
        WorkspaceRole.OWNER,
      );

      expect(result).toEqual({
        data: 'Membro removido do workspace.',
        userDeleted: false,
      });
      expect(mockTx.user.delete).not.toHaveBeenCalled();
    });

    it('exclui conta USER ao remover último membership', async () => {
      const result = await service.removeMember(
        workspaceId,
        userId,
        WorkspaceRole.OWNER,
      );

      expect(result).toEqual({
        data: 'Membro removido do workspace.',
        userDeleted: true,
      });
      expect(mockTx.workspaceMember.delete).toHaveBeenCalledWith({
        where: { id: membershipId },
      });
      expect(mockTx.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('preserva conta SUPER_ADMIN mesmo sem memberships', async () => {
      mockTx.user.findUnique.mockResolvedValueOnce({
        id: userId,
        role: 'SUPER_ADMIN',
      });

      const result = await service.removeMember(
        workspaceId,
        userId,
        WorkspaceRole.OWNER,
      );

      expect(result).toEqual({
        data: 'Membro removido do workspace.',
        userDeleted: false,
      });
      expect(mockTx.user.delete).not.toHaveBeenCalled();
    });
  });
});
