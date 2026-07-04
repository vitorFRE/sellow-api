import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ListFeedbackQueryDto } from './dto/list-feedback-query.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

const feedbackInclude = {
  user: { select: { id: true, name: true, email: true } },
  workspace: { select: { id: true, name: true } },
} satisfies Prisma.FeedbackInclude;

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, workspaceId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        userId,
        workspaceId,
        type: dto.type,
        message: dto.message,
      },
      include: feedbackInclude,
    });
  }

  async findMine(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: feedbackInclude,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllAdmin(query: ListFeedbackQueryDto, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where: Prisma.FeedbackWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.workspaceId) where.workspaceId = query.workspaceId;

    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) {
        where.createdAt.gte = new Date(query.createdFrom);
      }
      if (query.createdTo) {
        const to = new Date(query.createdTo);
        to.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { message: { contains: term } },
        { user: { name: { contains: term } } },
        { user: { email: { contains: term } } },
        { workspace: { name: { contains: term } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: feedbackInclude,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    return this.prisma.feedback.findUnique({
      where: { id },
      include: feedbackInclude,
    });
  }

  async findByIdSafe(id: string) {
    const feedback = await this.findById(id);
    if (!feedback) throw new NotFoundException('Feedback não encontrado');
    return feedback;
  }

  async updateAdmin(id: string, dto: UpdateFeedbackDto) {
    await this.findByIdSafe(id);

    const data: Prisma.FeedbackUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.adminNote !== undefined) data.adminNote = dto.adminNote;

    return this.prisma.feedback.update({
      where: { id },
      data,
      include: feedbackInclude,
    });
  }
}
