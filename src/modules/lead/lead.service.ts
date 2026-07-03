import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { LeadStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import {
  LeadListFilters,
  ListLeadsImportReviewFilter,
  ListLeadsSortBy,
  ListLeadsSortDir,
} from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateLeadImportReviewDto } from './dto/update-lead-import-review.dto';
import { UpsertLeadNotesDto } from './dto/upsert-lead-notes.dto';
import { UpsertLeadFollowUpDto } from './dto/upsert-lead-follow-up.dto';
import type { DashboardSummaryResult } from './types/dashboard-summary.types';
import {
  endOfMonthUtcFromKey,
  FUNNEL_CHART_MONTHS,
  getRollingMonthKeysUtc,
  monthKeyUtc,
  startOfMonthUtcFromKey,
} from './utils/funnel-chart-date.utils';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

  private mapLeadOutput(lead: {
    lossReasonId?: string | null;
    lossReason?: { name: string } | null;
    [key: string]: unknown;
  }) {
    const { lossReasonId, lossReason, ...rest } = lead;
    return {
      ...rest,
      lossReason: lossReason?.name ?? null,
    };
  }

  async create(workspaceId: string, dto: CreateLeadDto) {
    if (dto.email) {
      const existingEmailLead = await this.prisma.lead.findUnique({
        where: {
          workspaceId_email: { workspaceId, email: dto.email },
        },
      });
      if (existingEmailLead)
        throw new ConflictException('E-mail já cadastrado para outro lead');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.lead.findUnique({
        where: {
          workspaceId_phone: { workspaceId, phone: dto.phone },
        },
      });
      if (existingPhone)
        throw new ConflictException('Telefone já cadastrado para outro lead');
    }

    const lead = await this.prisma.lead.create({
      data: {
        workspaceId,
        ...dto,
      },
    });

    return lead;
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.lead.findFirst({
      where: { id, workspaceId },
      include: { lossReason: { select: { name: true } } },
    });
  }

  async findByIdSafe(workspaceId: string, id: string) {
    const lead = await this.findById(workspaceId, id);
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return this.mapLeadOutput(lead);
  }

  private buildListLeadsFilters(
    workspaceId: string,
    query: LeadListFilters,
  ): {
    where: Prisma.LeadWhereInput;
    orderBy: Prisma.LeadOrderByWithRelationInput[];
  } {
    const clauses: Prisma.LeadWhereInput[] = [{ workspaceId }];

    if (query.status !== undefined) {
      clauses.push({ status: query.status });
    }

    const searchRaw = query.search;
    const term =
      typeof searchRaw === 'string' && searchRaw.trim().length > 0
        ? searchRaw.trim()
        : '';
    if (term.length > 0) {
      clauses.push({
        OR: [{ name: { contains: term } }, { phone: { contains: term } }],
      });
    }

    const minScore = query.minTotalScore;
    if (typeof minScore === 'number' && !Number.isNaN(minScore)) {
      clauses.push({
        AND: [{ totalScore: { not: null } }, { totalScore: { gte: minScore } }],
      });
    }

    const minReviews = query.minReviewsCount;
    if (typeof minReviews === 'number' && !Number.isNaN(minReviews)) {
      clauses.push({
        AND: [
          { reviewsCount: { not: null } },
          { reviewsCount: { gte: minReviews } },
        ],
      });
    }

    if (query.hasWebsite === true) {
      clauses.push({
        AND: [{ website: { not: null } }, { website: { not: { equals: '' } } }],
      });
    } else if (query.hasWebsite === false) {
      clauses.push({
        OR: [{ website: null }, { website: '' }],
      });
    }

    if (query.importReview === ListLeadsImportReviewFilter.POSITIVE) {
      clauses.push({ importReview: 'POSITIVE' });
    } else if (query.importReview === ListLeadsImportReviewFilter.NEGATIVE) {
      clauses.push({ importReview: 'NEGATIVE' });
    } else if (query.importReview === ListLeadsImportReviewFilter.UNEVALUATED) {
      clauses.push({ importReview: null });
    }

    const sortBy: ListLeadsSortBy = query.sortBy ?? ListLeadsSortBy.updatedAt;
    const sortDirRaw = query.sortDir;
    const sortDir: 'asc' | 'desc' =
      sortDirRaw === ListLeadsSortDir.asc ? 'asc' : 'desc';

    if (sortBy === ListLeadsSortBy.totalScore) {
      clauses.push({ totalScore: { not: null } });
    } else if (sortBy === ListLeadsSortBy.reviewsCount) {
      clauses.push({ reviewsCount: { not: null } });
    }

    let where: Prisma.LeadWhereInput;
    if (clauses.length === 1) {
      const [first] = clauses;
      where = first;
    } else {
      where = { AND: clauses };
    }

    let orderBy: Prisma.LeadOrderByWithRelationInput[];
    if (sortBy === ListLeadsSortBy.updatedAt) {
      orderBy = [{ updatedAt: sortDir }, { id: 'asc' }];
    } else if (sortBy === ListLeadsSortBy.totalScore) {
      orderBy = [{ totalScore: sortDir }, { id: 'asc' }];
    } else {
      orderBy = [{ reviewsCount: sortDir }, { id: 'asc' }];
    }

    return { where, orderBy };
  }

  async findAll(
    workspaceId: string,
    page: number,
    limit: number,
    filters: LeadListFilters,
  ) {
    const skip = (page - 1) * limit;
    const { where, orderBy } = this.buildListLeadsFilters(workspaceId, filters);

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { lossReason: { select: { name: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data: data.map((lead) => this.mapLeadOutput(lead)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardSummary(
    workspaceId: string,
  ): Promise<DashboardSummaryResult> {
    const monthKeys = getRollingMonthKeysUtc(FUNNEL_CHART_MONTHS);
    const firstMonth = monthKeys[0];
    const lastMonth = monthKeys[monthKeys.length - 1];
    if (!firstMonth || !lastMonth) {
      throw new Error('FUNNEL_CHART_MONTHS must be at least 1');
    }
    const rangeStart = startOfMonthUtcFromKey(firstMonth);
    const rangeEnd = endOfMonthUtcFromKey(lastMonth);

    const [grouped, recentRaw, followUpsRaw, leadCreatedRows, wonRows] =
      await Promise.all([
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { workspaceId },
          _count: { _all: true },
        }),
        this.prisma.lead.findMany({
          where: { workspaceId },
          take: 10,
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          include: { lossReason: { select: { name: true } } },
        }),
        this.prisma.leadFollowUp.findMany({
          where: { lead: { workspaceId } },
          take: 10,
          orderBy: { nextContactAt: 'asc' },
          include: { lead: { select: { id: true, name: true } } },
        }),
        this.prisma.lead.findMany({
          where: {
            workspaceId,
            createdAt: { gte: rangeStart, lte: rangeEnd },
          },
          select: { createdAt: true },
        }),
        this.prisma.lead.findMany({
          where: {
            workspaceId,
            status: LeadStatus.WON,
            updatedAt: { gte: rangeStart, lte: rangeEnd },
          },
          select: { updatedAt: true },
        }),
      ]);

    const allStatuses = Object.values(LeadStatus) as LeadStatus[];
    const countsByStatus = Object.fromEntries(
      allStatuses.map((status) => [status, 0]),
    ) as Record<LeadStatus, number>;

    for (const row of grouped) {
      countsByStatus[row.status] = row._count._all;
    }

    const totalLeads = allStatuses.reduce(
      (sum, s) => sum + countsByStatus[s],
      0,
    );

    const leadsCreatedByMonth = new Map<string, number>(
      monthKeys.map((k) => [k, 0]),
    );
    const salesWonByMonth = new Map<string, number>(
      monthKeys.map((k) => [k, 0]),
    );

    for (const row of leadCreatedRows) {
      const k = monthKeyUtc(new Date(row.createdAt));
      if (leadsCreatedByMonth.has(k)) {
        leadsCreatedByMonth.set(k, (leadsCreatedByMonth.get(k) ?? 0) + 1);
      }
    }
    for (const row of wonRows) {
      const k = monthKeyUtc(new Date(row.updatedAt));
      if (salesWonByMonth.has(k)) {
        salesWonByMonth.set(k, (salesWonByMonth.get(k) ?? 0) + 1);
      }
    }

    const funnelChart = monthKeys.map((month) => ({
      month,
      leadsCreated: leadsCreatedByMonth.get(month) ?? 0,
      salesWon: salesWonByMonth.get(month) ?? 0,
    }));

    return {
      totalLeads,
      countsByStatus,
      funnelChart,
      recentLeads: recentRaw.map((lead) => this.mapLeadOutput(lead)),
      upcomingFollowUps: followUpsRaw.map((row) => ({
        leadId: row.lead.id,
        leadName: row.lead.name,
        ...this.mapFollowUpOutput(row),
      })),
    };
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    dto: UpdateLeadStatusDto,
  ) {
    await this.findByIdSafe(workspaceId, id);

    if (dto.status === LeadStatus.LOST) {
      if (!dto.lossReasonId)
        throw new BadRequestException(
          'É obrigatório informar o motivo de perda ao mover o lead para LOST',
        );

      const reason = await this.prisma.lossReason.findFirst({
        where: { id: dto.lossReasonId, workspaceId },
      });
      if (!reason)
        throw new NotFoundException('Motivo de perda não encontrado');
    }

    const isLost = dto.status === LeadStatus.LOST;

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status,
        lossReasonId: isLost ? dto.lossReasonId : null,
        lossReasonNote: isLost ? (dto.lossReasonNote ?? null) : null,
        lastManualUpdateAt: new Date(),
      },
      include: { lossReason: { select: { name: true } } },
    });

    return this.mapLeadOutput(updatedLead);
  }

  async updateImportReview(
    workspaceId: string,
    id: string,
    dto: UpdateLeadImportReviewDto,
  ) {
    await this.findByIdSafe(workspaceId, id);

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: { importReview: dto.importReview },
      include: { lossReason: { select: { name: true } } },
    });

    return this.mapLeadOutput(updatedLead);
  }

  async remove(workspaceId: string, id: string) {
    await this.findByIdSafe(workspaceId, id);

    const deletedLead = await this.prisma.lead.delete({ where: { id } });
    return {
      data: `Lead ${deletedLead.name} deletado.`,
    };
  }

  async getNotes(workspaceId: string, id: string) {
    const lead = await this.findById(workspaceId, id);
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return { body: lead.notes ?? '' };
  }

  async upsertNotes(workspaceId: string, id: string, dto: UpsertLeadNotesDto) {
    await this.findByIdSafe(workspaceId, id);
    const updated = await this.prisma.lead.update({
      where: { id },
      data: { notes: dto.body, lastManualUpdateAt: new Date() },
    });
    return { body: updated.notes ?? '' };
  }

  async getFollowUp(workspaceId: string, id: string) {
    await this.findByIdSafe(workspaceId, id);
    const row = await this.prisma.leadFollowUp.findUnique({
      where: { leadId: id },
    });
    if (!row) return null;
    return this.mapFollowUpOutput(row);
  }

  async upsertFollowUp(
    workspaceId: string,
    id: string,
    dto: UpsertLeadFollowUpDto,
  ) {
    await this.findByIdSafe(workspaceId, id);
    const [row] = await this.prisma.$transaction([
      this.prisma.leadFollowUp.upsert({
        where: { leadId: id },
        create: {
          leadId: id,
          nextContactAt: new Date(dto.nextContactAt),
          channel: dto.channel,
          ownerLabel: dto.ownerLabel,
          reminder: dto.reminder ?? null,
        },
        update: {
          nextContactAt: new Date(dto.nextContactAt),
          channel: dto.channel,
          ownerLabel: dto.ownerLabel,
          reminder: dto.reminder ?? null,
        },
      }),
      this.prisma.lead.update({
        where: { id },
        data: { lastManualUpdateAt: new Date() },
      }),
    ]);
    return this.mapFollowUpOutput(row);
  }

  async clearFollowUp(workspaceId: string, id: string) {
    await this.findByIdSafe(workspaceId, id);
    await this.prisma.$transaction([
      this.prisma.leadFollowUp.deleteMany({ where: { leadId: id } }),
      this.prisma.lead.update({
        where: { id },
        data: { lastManualUpdateAt: new Date() },
      }),
    ]);
    return null;
  }

  private mapFollowUpOutput(row: {
    nextContactAt: Date;
    channel: string;
    ownerLabel: string;
    reminder: string | null;
  }) {
    return {
      nextContactAt: row.nextContactAt.toISOString(),
      channel: row.channel,
      ownerLabel: row.ownerLabel,
      reminder: row.reminder ?? null,
    };
  }
}
