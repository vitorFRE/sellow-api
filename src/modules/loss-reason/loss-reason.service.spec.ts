import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'modules/prisma/prisma.service';
import { LossReasonService } from './loss-reason.service';

const mockReason = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Sem orçamento',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  lossReason: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  lead: {
    count: jest.fn(),
  },
};

describe('LossReasonService', () => {
  let service: LossReasonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LossReasonService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LossReasonService>(LossReasonService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('lança ConflictException se nome já existe', async () => {
      mockPrisma.lossReason.findUnique.mockResolvedValue(mockReason);

      await expect(service.create({ name: mockReason.name })).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.lossReason.create).not.toHaveBeenCalled();
    });

    it('cria e retorna o motivo', async () => {
      mockPrisma.lossReason.findUnique.mockResolvedValue(null);
      mockPrisma.lossReason.create.mockResolvedValue(mockReason);

      const result = await service.create({ name: mockReason.name });

      expect(mockPrisma.lossReason.create).toHaveBeenCalledWith({
        data: { name: mockReason.name },
      });
      expect(result).toEqual(mockReason);
    });
  });

  describe('findAll', () => {
    it('retorna lista ordenada por nome', async () => {
      mockPrisma.lossReason.findMany.mockResolvedValue([mockReason]);

      const result = await service.findAll();

      expect(mockPrisma.lossReason.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([mockReason]);
    });
  });

  describe('findByIdSafe', () => {
    it('lança NotFoundException se não existe', async () => {
      mockPrisma.lossReason.findUnique.mockResolvedValue(null);

      await expect(service.findByIdSafe(mockReason.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna motivo quando existe', async () => {
      mockPrisma.lossReason.findUnique.mockResolvedValue(mockReason);

      await expect(service.findByIdSafe(mockReason.id)).resolves.toEqual(
        mockReason,
      );
    });
  });

  describe('update', () => {
    it('lança NotFoundException se id não existe', async () => {
      mockPrisma.lossReason.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockReason.id, { name: 'Novo nome' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.lossReason.update).not.toHaveBeenCalled();
    });

    it('lança ConflictException se novo nome já pertence a outro motivo', async () => {
      const outro = {
        ...mockReason,
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      };
      mockPrisma.lossReason.findUnique
        .mockResolvedValueOnce(mockReason)
        .mockResolvedValueOnce(outro);

      await expect(
        service.update(mockReason.id, { name: 'Sem orçamento' }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.lossReason.update).not.toHaveBeenCalled();
    });

    it('atualiza e retorna motivo', async () => {
      const updated = { ...mockReason, name: 'Concorrência' };
      mockPrisma.lossReason.findUnique
        .mockResolvedValueOnce(mockReason)
        .mockResolvedValueOnce(null);
      mockPrisma.lossReason.update.mockResolvedValue(updated);

      const result = await service.update(mockReason.id, {
        name: 'Concorrência',
      });

      expect(mockPrisma.lossReason.update).toHaveBeenCalledWith({
        where: { id: mockReason.id },
        data: { name: 'Concorrência' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('lança NotFoundException se id não existe', async () => {
      mockPrisma.lossReason.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockReason.id)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.lossReason.delete).not.toHaveBeenCalled();
    });

    it('lança ConflictException se motivo está em uso por leads', async () => {
      mockPrisma.lossReason.findUnique.mockResolvedValue(mockReason);
      mockPrisma.lead.count.mockResolvedValue(3);

      await expect(service.remove(mockReason.id)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.lossReason.delete).not.toHaveBeenCalled();
    });

    it('remove e retorna mensagem', async () => {
      mockPrisma.lossReason.findUnique.mockResolvedValue(mockReason);
      mockPrisma.lead.count.mockResolvedValue(0);
      mockPrisma.lossReason.delete.mockResolvedValue(mockReason);

      const result = await service.remove(mockReason.id);

      expect(mockPrisma.lossReason.delete).toHaveBeenCalledWith({
        where: { id: mockReason.id },
      });
      expect(result).toEqual({
        data: `Motivo de perda "${mockReason.name}" removido.`,
      });
    });
  });
});
