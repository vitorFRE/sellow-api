import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';
import { UpdateLossReasonDto } from './dto/update-loss-reason.dto';

@Injectable()
export class LossReasonService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateLossReasonDto) {
    const existing = await this.prisma.lossReason.findUnique({
      where: {
        workspaceId_name: { workspaceId, name: dto.name },
      },
    });
    if (existing) throw new ConflictException('Motivo de perda já cadastrado');

    return this.prisma.lossReason.create({
      data: { workspaceId, ...dto },
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.lossReason.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.lossReason.findFirst({
      where: { id, workspaceId },
    });
  }

  async findByIdSafe(workspaceId: string, id: string) {
    const reason = await this.findById(workspaceId, id);
    if (!reason) throw new NotFoundException('Motivo de perda não encontrado');
    return reason;
  }

  async update(workspaceId: string, id: string, dto: UpdateLossReasonDto) {
    await this.findByIdSafe(workspaceId, id);

    if (dto.name) {
      const existing = await this.prisma.lossReason.findUnique({
        where: {
          workspaceId_name: { workspaceId, name: dto.name },
        },
      });
      if (existing && existing.id !== id)
        throw new ConflictException(
          'Já existe um motivo de perda com esse nome',
        );
    }

    return this.prisma.lossReason.update({ where: { id }, data: dto });
  }

  async remove(workspaceId: string, id: string) {
    await this.findByIdSafe(workspaceId, id);

    const inUse = await this.prisma.lead.count({
      where: { workspaceId, lossReasonId: id },
    });
    if (inUse > 0)
      throw new ConflictException(
        `Motivo de perda está vinculado a ${inUse} lead(s) e não pode ser removido`,
      );

    const deleted = await this.prisma.lossReason.delete({ where: { id } });
    return { data: `Motivo de perda "${deleted.name}" removido.` };
  }
}
