import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackService } from './feedback.service';
import { FeedbackStatus, FeedbackType } from '../../generated/prisma/enums';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const WORKSPACE_ID = '00000000-0000-4000-8000-000000000002';
const FEEDBACK_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const mockFeedback = {
  id: FEEDBACK_ID,
  userId: USER_ID,
  workspaceId: WORKSPACE_ID,
  type: FeedbackType.BUG,
  message: 'Encontrei um bug no pipeline',
  status: FeedbackStatus.OPEN,
  adminNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: USER_ID,
    name: 'Vitor',
    email: 'vitor@teste.com',
  },
  workspace: {
    id: WORKSPACE_ID,
    name: 'Sellow',
  },
};

const mockPrisma = {
  feedback: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('cria feedback com status OPEN', async () => {
      mockPrisma.feedback.create.mockResolvedValue(mockFeedback);

      const result = await service.create(USER_ID, WORKSPACE_ID, {
        type: FeedbackType.BUG,
        message: 'Encontrei um bug no pipeline',
      });

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          type: FeedbackType.BUG,
          message: 'Encontrei um bug no pipeline',
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          workspace: { select: { id: true, name: true } },
        },
      });
      expect(result).toEqual(mockFeedback);
    });
  });

  describe('findMine', () => {
    it('retorna apenas feedbacks do usuário', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([mockFeedback]);
      mockPrisma.feedback.count.mockResolvedValue(1);

      const result = await service.findMine(USER_ID, 1, 20);

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.data).toEqual([mockFeedback]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findByIdSafe', () => {
    it('lança NotFoundException se não existe', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(null);

      await expect(service.findByIdSafe(FEEDBACK_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna feedback quando existe', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(mockFeedback);

      await expect(service.findByIdSafe(FEEDBACK_ID)).resolves.toEqual(
        mockFeedback,
      );
    });
  });

  describe('updateAdmin', () => {
    it('lança NotFoundException se id não existe', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAdmin(FEEDBACK_ID, { status: FeedbackStatus.IN_REVIEW }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.feedback.update).not.toHaveBeenCalled();
    });

    it('atualiza status e nota interna', async () => {
      const updated = {
        ...mockFeedback,
        status: FeedbackStatus.IN_REVIEW,
        adminNote: 'Investigando o problema',
      };
      mockPrisma.feedback.findUnique.mockResolvedValue(mockFeedback);
      mockPrisma.feedback.update.mockResolvedValue(updated);

      const result = await service.updateAdmin(FEEDBACK_ID, {
        status: FeedbackStatus.IN_REVIEW,
        adminNote: 'Investigando o problema',
      });

      expect(mockPrisma.feedback.update).toHaveBeenCalledWith({
        where: { id: FEEDBACK_ID },
        data: {
          status: FeedbackStatus.IN_REVIEW,
          adminNote: 'Investigando o problema',
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          workspace: { select: { id: true, name: true } },
        },
      });
      expect(result).toEqual(updated);
    });
  });
});
