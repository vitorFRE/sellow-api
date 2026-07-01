import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'modules/prisma/prisma.service';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';
import { UpdateLossReasonDto } from './dto/update-loss-reason.dto';

@Injectable()
export class LossReasonService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLossReasonDto) {
    const existing = await this.prisma.lossReason.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Motivo de perda já cadastrado');

    return this.prisma.lossReason.create({ data: dto });
  }

  async findAll() {
    return this.prisma.lossReason.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.lossReason.findUnique({ where: { id } });
  }

  async findByIdSafe(id: string) {
    const reason = await this.findById(id);
    if (!reason) throw new NotFoundException('Motivo de perda não encontrado');
    return reason;
  }

  async update(id: string, dto: UpdateLossReasonDto) {
    await this.findByIdSafe(id);

    if (dto.name) {
      const existing = await this.prisma.lossReason.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id)
        throw new ConflictException(
          'Já existe um motivo de perda com esse nome',
        );
    }

    return this.prisma.lossReason.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findByIdSafe(id);

    const inUse = await this.prisma.lead.count({ where: { lossReasonId: id } });
    if (inUse > 0)
      throw new ConflictException(
        `Motivo de perda está vinculado a ${inUse} lead(s) e não pode ser removido`,
      );

    const deleted = await this.prisma.lossReason.delete({ where: { id } });
    return { data: `Motivo de perda "${deleted.name}" removido.` };
  }
}
