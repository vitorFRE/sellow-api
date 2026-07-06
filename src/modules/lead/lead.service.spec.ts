import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadService } from './lead.service';
import { Prisma } from '../../generated/prisma/client';
import { LeadStatus, LeadImportReview } from '../../generated/prisma/enums';
import {
  ListLeadsImportReviewFilter,
  ListLeadsSortBy,
} from './dto/list-leads-query.dto';
import {
  mockLead,
  mockLeadFixo,
  mockLossReason,
  mockPrisma,
  mockWorkspaceId,
} from './constants/lead.service.mocks';

describe('LeadService', () => {
  let service: LeadService;
  const anyDate = expect.any(Date) as unknown as Date;
  const WORKSPACE_ID = mockWorkspaceId;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LeadService>(LeadService);
    jest.clearAllMocks();
    mockPrisma.lead.findFirst.mockReset();
    mockPrisma.lead.findFirst.mockReset();
    mockPrisma.lead.create.mockReset();
    mockPrisma.lead.findMany.mockReset();
    mockPrisma.lead.groupBy.mockReset();
    mockPrisma.lead.count.mockReset();
    mockPrisma.lead.delete.mockReset();
    mockPrisma.lead.update.mockReset();
    mockPrisma.lossReason.findUnique.mockReset();
    mockPrisma.lossReason.findFirst.mockReset();
    mockPrisma.leadFollowUp.findUnique.mockReset();
    mockPrisma.leadFollowUp.findMany.mockReset();
    mockPrisma.leadFollowUp.upsert.mockReset();
    mockPrisma.leadFollowUp.deleteMany.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
  });

  describe('create', () => {
    it('lança ConflictException se e-mail já existe', async () => {
      mockPrisma.lead.findUnique.mockResolvedValueOnce(mockLead);

      await expect(
        service.create(WORKSPACE_ID, { name: 'Novo', email: mockLead.email }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.lead.create).not.toHaveBeenCalled();
    });

    it('lança ConflictException se telefone celular já existe', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      await expect(
        service.create(WORKSPACE_ID, { name: 'Novo', phone: mockLead.phone }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.lead.create).not.toHaveBeenCalled();
    });

    it('lança ConflictException se telefone fixo (8 dígitos locais) já existe', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLeadFixo);

      await expect(
        service.create(WORKSPACE_ID, {
          name: 'Novo',
          phone: mockLeadFixo.phone,
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.lead.create).not.toHaveBeenCalled();
    });

    it('cria lead com telefone fixo em E.164', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue(mockLeadFixo);

      const dto = { name: 'Empresa', phone: mockLeadFixo.phone };
      const result = await service.create(WORKSPACE_ID, dto);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: { workspaceId: WORKSPACE_ID, ...dto },
      });
      expect(result).toEqual(mockLeadFixo);
    });

    it('cria lead e retorna registro', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);
      mockPrisma.lead.create.mockResolvedValue(mockLead);

      const dto = { name: 'Só nome' };
      const result = await service.create(WORKSPACE_ID, dto);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: { workspaceId: WORKSPACE_ID, ...dto },
      });
      expect(result).toEqual(mockLead);
    });
  });

  describe('findByIdSafe', () => {
    it('lança NotFoundException se lead não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.findByIdSafe(
          WORKSPACE_ID,
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('retorna lead quando existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        lossReason: null,
      });

      await expect(
        service.findByIdSafe(WORKSPACE_ID, mockLead.id),
      ).resolves.toEqual(
        expect.objectContaining({
          id: mockLead.id,
          lossReason: null,
        }),
      );
      expect(mockPrisma.lead.findFirst).toHaveBeenCalledWith({
        where: { id: mockLead.id, workspaceId: WORKSPACE_ID },
        include: { lossReason: { select: { name: true } } },
      });
    });
  });

  describe('findAll', () => {
    it('retorna dados paginados e meta', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([
        { ...mockLead, lossReason: null },
      ]);
      mockPrisma.lead.count.mockResolvedValue(25);

      const result = await service.findAll(WORKSPACE_ID, 2, 10, {});

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: { workspaceId: WORKSPACE_ID },
        skip: 10,
        take: 10,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: { lossReason: { select: { name: true } } },
      });
      expect(mockPrisma.lead.count).toHaveBeenCalledWith({
        where: { workspaceId: WORKSPACE_ID },
      });
      expect(result.data).toEqual([
        expect.objectContaining({
          id: mockLead.id,
          lossReason: null,
        }),
      ]);
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('filtra por status e aplica o mesmo where no count', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([
        { ...mockLead, lossReason: null },
      ]);
      mockPrisma.lead.count.mockResolvedValue(3);

      await service.findAll(WORKSPACE_ID, 1, 20, { status: LeadStatus.NEW });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ workspaceId: WORKSPACE_ID }, { status: LeadStatus.NEW }],
        },
        skip: 0,
        take: 20,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: { lossReason: { select: { name: true } } },
      });
      expect(mockPrisma.lead.count).toHaveBeenCalledWith({
        where: {
          AND: [{ workspaceId: WORKSPACE_ID }, { status: LeadStatus.NEW }],
        },
      });
    });

    it('aplica busca em nome ou telefone', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      await service.findAll(WORKSPACE_ID, 1, 20, { search: '  Acme  ' });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { workspaceId: WORKSPACE_ID },
            {
              OR: [
                { name: { contains: 'Acme' } },
                { phone: { contains: 'Acme' } },
              ],
            },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: { lossReason: { select: { name: true } } },
      });
    });

    it('filtra hasWebsite=true e ordena por totalScore', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      await service.findAll(WORKSPACE_ID, 1, 10, {
        hasWebsite: true,
        sortBy: ListLeadsSortBy.totalScore,
      });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { workspaceId: WORKSPACE_ID },
            {
              AND: [
                { website: { not: null } },
                { website: { not: { equals: '' } } },
              ],
            },
            { totalScore: { not: null } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: [{ totalScore: 'desc' }, { id: 'asc' }],
        include: { lossReason: { select: { name: true } } },
      });
    });

    it('filtra por importReview POSITIVE', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      await service.findAll(WORKSPACE_ID, 1, 20, {
        importReview: ListLeadsImportReviewFilter.POSITIVE,
      });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ workspaceId: WORKSPACE_ID }, { importReview: 'POSITIVE' }],
        },
        skip: 0,
        take: 20,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: { lossReason: { select: { name: true } } },
      });
    });

    it('filtra por importReview UNEVALUATED', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      await service.findAll(WORKSPACE_ID, 1, 20, {
        importReview: ListLeadsImportReviewFilter.UNEVALUATED,
      });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ workspaceId: WORKSPACE_ID }, { importReview: null }],
        },
        skip: 0,
        take: 20,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: { lossReason: { select: { name: true } } },
      });
    });
  });

  describe('updateImportReview', () => {
    it('lança NotFoundException se id não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.updateImportReview(WORKSPACE_ID, mockLead.id, {
          importReview: LeadImportReview.POSITIVE,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('atualiza importReview POSITIVE sem lastManualUpdateAt', async () => {
      const updated = {
        ...mockLead,
        importReview: LeadImportReview.POSITIVE,
        lossReason: null,
      };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(updated);

      const result = await service.updateImportReview(
        WORKSPACE_ID,
        mockLead.id,
        {
          importReview: LeadImportReview.POSITIVE,
        },
      );

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { importReview: LeadImportReview.POSITIVE },
        include: { lossReason: { select: { name: true } } },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockLead.id,
          importReview: LeadImportReview.POSITIVE,
        }),
      );
    });

    it('limpa importReview com null sem lastManualUpdateAt', async () => {
      const updated = {
        ...mockLead,
        importReview: null,
        lossReason: null,
      };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(updated);

      await service.updateImportReview(WORKSPACE_ID, mockLead.id, {
        importReview: null,
      });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { importReview: null },
        include: { lossReason: { select: { name: true } } },
      });
    });
  });

  describe('update', () => {
    it('atualiza só name e seta lastManualUpdateAt', async () => {
      const updated = {
        ...mockLead,
        name: 'Acme Corp',
        lossReason: null,
      };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(updated);

      const result = await service.update(WORKSPACE_ID, mockLead.id, {
        name: 'Acme Corp',
      });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: {
          name: 'Acme Corp',
          lastManualUpdateAt: anyDate,
        },
        include: { lossReason: { select: { name: true } } },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockLead.id,
          name: 'Acme Corp',
          lossReason: null,
        }),
      );
    });

    it('atualiza múltiplos campos de perfil', async () => {
      const updated = {
        ...mockLead,
        name: 'Acme Corp',
        phone: '+5511999999999',
        budget: 15000,
        city: 'São Paulo',
        lossReason: null,
      };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(updated);

      await service.update(WORKSPACE_ID, mockLead.id, {
        name: 'Acme Corp',
        phone: '+5511999999999',
        budget: 15000,
        city: 'São Paulo',
      });

      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_phone: {
            workspaceId: WORKSPACE_ID,
            phone: '+5511999999999',
          },
        },
      });
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: {
          name: 'Acme Corp',
          phone: '+5511999999999',
          budget: 15000,
          city: 'São Paulo',
          lastManualUpdateAt: anyDate,
        },
        include: { lossReason: { select: { name: true } } },
      });
    });

    it('permite manter mesmo email e telefone do próprio lead', async () => {
      const updated = { ...mockLead, name: 'Renomeado', lossReason: null };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.findUnique
        .mockResolvedValueOnce(mockLead)
        .mockResolvedValueOnce(mockLead);
      mockPrisma.lead.update.mockResolvedValue(updated);

      await service.update(WORKSPACE_ID, mockLead.id, {
        name: 'Renomeado',
        email: mockLead.email,
        phone: mockLead.phone,
      });

      expect(mockPrisma.lead.update).toHaveBeenCalled();
    });

    it('lança ConflictException se email pertence a outro lead', async () => {
      const otherLead = {
        ...mockLead,
        id: '99999999-9999-9999-9999-999999999999',
      };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.findUnique.mockResolvedValue(otherLead);

      await expect(
        service.update(WORKSPACE_ID, mockLead.id, {
          email: otherLead.email,
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('lança ConflictException se telefone pertence a outro lead', async () => {
      const otherLead = { ...mockLeadFixo };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.findUnique.mockResolvedValue(otherLead);

      await expect(
        service.update(WORKSPACE_ID, mockLead.id, {
          phone: otherLead.phone,
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('lança NotFoundException se lead não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.update(WORKSPACE_ID, mockLead.id, { name: 'Novo' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('lança BadRequestException se body vazio', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);

      await expect(
        service.update(WORKSPACE_ID, mockLead.id, {}),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('limpa campo opcional com null', async () => {
      const updated = { ...mockLead, email: null, lossReason: null };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(updated);

      await service.update(WORKSPACE_ID, mockLead.id, { email: null });

      expect(mockPrisma.lead.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: {
          email: null,
          lastManualUpdateAt: anyDate,
        },
        include: { lossReason: { select: { name: true } } },
      });
    });
  });

  describe('getDashboardSummary', () => {
    it('agrega contagens, leads recentes e follow-ups', async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([
        { status: LeadStatus.NEW, _count: { _all: 2 } },
        { status: LeadStatus.WON, _count: { _all: 1 } },
      ]);
      mockPrisma.lead.findMany.mockImplementation(
        (args?: Prisma.LeadFindManyArgs) => {
          if (
            args?.select &&
            typeof args.select === 'object' &&
            'createdAt' in args.select &&
            args.select.createdAt === true
          ) {
            return Promise.resolve([{ createdAt: mockLead.createdAt }]);
          }
          if (
            args?.where &&
            typeof args.where === 'object' &&
            'status' in args.where &&
            args.where.status === LeadStatus.WON &&
            args.select &&
            typeof args.select === 'object' &&
            'updatedAt' in args.select &&
            args.select.updatedAt === true
          ) {
            return Promise.resolve([
              { updatedAt: new Date('2026-04-15T10:00:00.000Z') },
            ]);
          }
          return Promise.resolve([{ ...mockLead, lossReason: null }]);
        },
      );
      const fuDate = new Date('2026-05-01T10:00:00.000Z');
      mockPrisma.leadFollowUp.findMany.mockResolvedValue([
        {
          id: 'fu-1',
          leadId: mockLead.id,
          nextContactAt: fuDate,
          channel: 'WhatsApp',
          ownerLabel: 'Ana',
          reminder: 'Ligar',
          createdAt: new Date(),
          updatedAt: new Date(),
          lead: { id: mockLead.id, name: mockLead.name },
        },
      ]);

      const result = await service.getDashboardSummary(WORKSPACE_ID);

      expect(mockPrisma.lead.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { workspaceId: WORKSPACE_ID },
        _count: { _all: true },
      });
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: { workspaceId: WORKSPACE_ID },
        take: 10,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        include: { lossReason: { select: { name: true } } },
      });
      expect(mockPrisma.leadFollowUp.findMany).toHaveBeenCalledWith({
        where: { lead: { workspaceId: WORKSPACE_ID } },
        take: 10,
        orderBy: { nextContactAt: 'asc' },
        include: { lead: { select: { id: true, name: true } } },
      });
      expect(result.funnelChart).toHaveLength(6);
      const monthKey = /^\d{4}-\d{2}$/;
      for (const point of result.funnelChart) {
        expect(monthKey.test(point.month)).toBe(true);
        expect(typeof point.leadsCreated).toBe('number');
        expect(typeof point.salesWon).toBe('number');
      }

      expect(result.totalLeads).toBe(3);
      expect(result.countsByStatus[LeadStatus.NEW]).toBe(2);
      expect(result.countsByStatus[LeadStatus.WON]).toBe(1);
      expect(result.countsByStatus[LeadStatus.LOST]).toBe(0);
      expect(result.recentLeads).toEqual([
        expect.objectContaining({
          id: mockLead.id,
          lossReason: null,
        }),
      ]);
      expect(result.upcomingFollowUps).toEqual([
        {
          leadId: mockLead.id,
          leadName: mockLead.name,
          nextContactAt: fuDate.toISOString(),
          channel: 'WhatsApp',
          ownerLabel: 'Ana',
          reminder: 'Ligar',
        },
      ]);
    });
  });

  describe('updateStatus', () => {
    it('lança NotFoundException se id não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus(WORKSPACE_ID, mockLead.id, {
          status: LeadStatus.CONTACTED,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('atualiza status e retorna lead', async () => {
      const updated = {
        ...mockLead,
        status: LeadStatus.CONTACTED,
        lossReason: null,
      };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue(updated);

      const result = await service.updateStatus(WORKSPACE_ID, mockLead.id, {
        status: LeadStatus.CONTACTED,
      });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: {
          status: LeadStatus.CONTACTED,
          lossReasonId: null,
          lossReasonNote: null,
          lastManualUpdateAt: anyDate,
        },
        include: { lossReason: { select: { name: true } } },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockLead.id,
          status: LeadStatus.CONTACTED,
          lossReason: null,
        }),
      );
    });

    it('lança BadRequestException ao mover para LOST sem lossReasonId', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);

      await expect(
        service.updateStatus(WORKSPACE_ID, mockLead.id, {
          status: LeadStatus.LOST,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('lança NotFoundException ao mover para LOST com lossReasonId inexistente', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lossReason.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus(WORKSPACE_ID, mockLead.id, {
          status: LeadStatus.LOST,
          lossReasonId: mockLossReason.id,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('move para LOST com motivo válido e persiste lossReasonId', async () => {
      const updated = {
        ...mockLead,
        status: LeadStatus.LOST,
        lossReasonId: mockLossReason.id,
        lossReasonNote: 'fora do orçamento',
        lossReason: { name: mockLossReason.name },
      };
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lossReason.findFirst.mockResolvedValue(mockLossReason);
      mockPrisma.lead.update.mockResolvedValue(updated);

      const result = await service.updateStatus(WORKSPACE_ID, mockLead.id, {
        status: LeadStatus.LOST,
        lossReasonId: mockLossReason.id,
        lossReasonNote: 'fora do orçamento',
      });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: {
          status: LeadStatus.LOST,
          lossReasonId: mockLossReason.id,
          lossReasonNote: 'fora do orçamento',
          lastManualUpdateAt: anyDate,
        },
        include: { lossReason: { select: { name: true } } },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockLead.id,
          status: LeadStatus.LOST,
          lossReason: mockLossReason.name,
        }),
      );
    });

    it('limpa lossReasonId ao sair do status LOST', async () => {
      const lostLead = {
        ...mockLead,
        status: LeadStatus.LOST,
        lossReasonId: mockLossReason.id,
      };
      const reopened = {
        ...mockLead,
        status: LeadStatus.NEGOTIATION,
        lossReasonId: null,
        lossReasonNote: null,
        lossReason: null,
      };
      mockPrisma.lead.findFirst.mockResolvedValue(lostLead);
      mockPrisma.lead.update.mockResolvedValue(reopened);

      const result = await service.updateStatus(WORKSPACE_ID, mockLead.id, {
        status: LeadStatus.NEGOTIATION,
      });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: {
          status: LeadStatus.NEGOTIATION,
          lossReasonId: null,
          lossReasonNote: null,
          lastManualUpdateAt: anyDate,
        },
        include: { lossReason: { select: { name: true } } },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockLead.id,
          status: LeadStatus.NEGOTIATION,
          lossReason: null,
        }),
      );
    });
  });

  describe('remove', () => {
    it('lança NotFoundException se id não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.remove(WORKSPACE_ID, mockLead.id)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.lead.delete).not.toHaveBeenCalled();
    });

    it('remove e retorna mensagem com nome', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.delete.mockResolvedValue(mockLead);

      const result = await service.remove(WORKSPACE_ID, mockLead.id);

      expect(mockPrisma.lead.delete).toHaveBeenCalledWith({
        where: { id: mockLead.id },
      });
      expect(result).toEqual({
        data: `Lead ${mockLead.name} deletado.`,
      });
    });
  });

  describe('getNotes', () => {
    it('lança NotFoundException se lead não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.getNotes(WORKSPACE_ID, mockLead.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna body vazio quando notes é null', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        notes: null,
        lossReason: null,
      });

      const result = await service.getNotes(WORKSPACE_ID, mockLead.id);

      expect(result).toEqual({ body: '' });
    });

    it('retorna body com o texto salvo', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        notes: 'Anotação de teste',
        lossReason: null,
      });

      const result = await service.getNotes(WORKSPACE_ID, mockLead.id);

      expect(result).toEqual({ body: 'Anotação de teste' });
    });
  });

  describe('upsertNotes', () => {
    it('lança NotFoundException se lead não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.upsertNotes(WORKSPACE_ID, mockLead.id, { body: 'texto' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('persiste as notas e retorna body atualizado', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        lossReason: null,
      });
      mockPrisma.lead.update.mockResolvedValue({
        ...mockLead,
        notes: 'Nova nota',
      });

      const result = await service.upsertNotes(WORKSPACE_ID, mockLead.id, {
        body: 'Nova nota',
      });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { notes: 'Nova nota', lastManualUpdateAt: anyDate },
      });
      expect(result).toEqual({ body: 'Nova nota' });
    });
  });

  describe('getFollowUp', () => {
    it('lança NotFoundException se lead não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.getFollowUp(WORKSPACE_ID, mockLead.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('retorna null quando não há follow-up agendado', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        lossReason: null,
      });
      mockPrisma.leadFollowUp.findUnique.mockResolvedValue(null);

      const result = await service.getFollowUp(WORKSPACE_ID, mockLead.id);

      expect(result).toBeNull();
      expect(mockPrisma.leadFollowUp.findUnique).toHaveBeenCalledWith({
        where: { leadId: mockLead.id },
      });
    });

    it('retorna objeto com campos mapeados quando há follow-up', async () => {
      const nextContactAt = new Date('2026-05-01T10:00:00.000Z');
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        lossReason: null,
      });
      mockPrisma.leadFollowUp.findUnique.mockResolvedValue({
        id: 'fu-1',
        leadId: mockLead.id,
        nextContactAt,
        channel: 'WhatsApp',
        ownerLabel: 'João',
        reminder: 'Ligar antes das 12h',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getFollowUp(WORKSPACE_ID, mockLead.id);

      expect(result).toEqual({
        nextContactAt: nextContactAt.toISOString(),
        channel: 'WhatsApp',
        ownerLabel: 'João',
        reminder: 'Ligar antes das 12h',
      });
    });

    it('retorna reminder null quando não foi preenchido', async () => {
      const nextContactAt = new Date('2026-05-01T10:00:00.000Z');
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        lossReason: null,
      });
      mockPrisma.leadFollowUp.findUnique.mockResolvedValue({
        id: 'fu-2',
        leadId: mockLead.id,
        nextContactAt,
        channel: 'E-mail',
        ownerLabel: 'Maria',
        reminder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getFollowUp(WORKSPACE_ID, mockLead.id);

      expect(result).toEqual(expect.objectContaining({ reminder: null }));
    });
  });

  describe('upsertFollowUp', () => {
    it('lança NotFoundException se lead não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.upsertFollowUp(WORKSPACE_ID, mockLead.id, {
          nextContactAt: '2026-05-01T10:00:00.000Z',
          channel: 'Ligação',
          ownerLabel: 'Ana',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('persiste follow-up e retorna objeto mapeado', async () => {
      const isoDate = '2026-05-01T10:00:00.000Z';
      const storedDate = new Date(isoDate);
      const followUpRow = {
        id: 'fu-upsert',
        leadId: mockLead.id,
        nextContactAt: storedDate,
        channel: 'Ligação',
        ownerLabel: 'Ana',
        reminder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        lossReason: null,
      });
      mockPrisma.leadFollowUp.upsert.mockResolvedValue(followUpRow);
      mockPrisma.lead.update.mockResolvedValue(mockLead);

      const result = await service.upsertFollowUp(WORKSPACE_ID, mockLead.id, {
        nextContactAt: isoDate,
        channel: 'Ligação',
        ownerLabel: 'Ana',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.leadFollowUp.upsert).toHaveBeenCalledWith({
        where: { leadId: mockLead.id },
        create: {
          leadId: mockLead.id,
          nextContactAt: expect.any(Date) as unknown as Date,
          channel: 'Ligação',
          ownerLabel: 'Ana',
          reminder: null,
        },
        update: {
          nextContactAt: expect.any(Date) as unknown as Date,
          channel: 'Ligação',
          ownerLabel: 'Ana',
          reminder: null,
        },
      });
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { lastManualUpdateAt: anyDate },
      });
      expect(result).toEqual({
        nextContactAt: storedDate.toISOString(),
        channel: 'Ligação',
        ownerLabel: 'Ana',
        reminder: null,
      });
    });
  });

  describe('clearFollowUp', () => {
    it('lança NotFoundException se lead não existe', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.clearFollowUp(WORKSPACE_ID, mockLead.id),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('remove o registro de follow-up e retorna null', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        lossReason: null,
      });
      mockPrisma.leadFollowUp.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.lead.update.mockResolvedValue(mockLead);

      const result = await service.clearFollowUp(WORKSPACE_ID, mockLead.id);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.leadFollowUp.deleteMany).toHaveBeenCalledWith({
        where: { leadId: mockLead.id },
      });
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { lastManualUpdateAt: anyDate },
      });
      expect(result).toBeNull();
    });
  });
});
