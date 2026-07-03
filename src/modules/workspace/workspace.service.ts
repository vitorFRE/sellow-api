import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateWorkspaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.name },
      });

      if (dto.ownerUserId) {
        const owner = await tx.user.findUnique({
          where: { id: dto.ownerUserId },
        });
        if (!owner) {
          throw new NotFoundException('Usuário owner não encontrado');
        }

        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: owner.id,
            role: WorkspaceRole.OWNER,
          },
        });
      }

      return workspace;
    });
  }

  async findAllForUser(userId: string, isSuperAdmin: boolean) {
    if (isSuperAdmin) {
      return this.prisma.workspace.findMany({
        orderBy: { name: 'asc' },
        include: {
          members: {
            where: { userId },
            select: { role: true },
          },
          _count: { select: { members: true } },
        },
      }).then((rows) =>
        rows.map(({ members, _count, ...workspace }) => ({
          ...workspace,
          role: members[0]?.role ?? WorkspaceRole.OWNER,
          memberCount: _count.members,
        })),
      );
    }

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { workspace: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }

  async findMembers(workspaceId: string) {
    await this.assertWorkspaceExists(workspaceId);

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      user: m.user,
      createdAt: m.createdAt,
    }));
  }

  async addMember(workspaceId: string, dto: AddWorkspaceMemberDto) {
    await this.assertWorkspaceExists(workspaceId);

    const role = dto.role ?? WorkspaceRole.MEMBER;
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      const existingMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMember) {
        throw new ConflictException('Usuário já é membro deste workspace');
      }

      const member = await this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: existingUser.id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      return {
        linked: true,
        member,
      };
    }

    if (!dto.password) {
      throw new BadRequestException(
        'Senha é obrigatória para criar um novo usuário',
      );
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const member = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          password: hashed,
        },
      });

      return tx.workspaceMember.create({
        data: {
          workspaceId,
          userId: user.id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
        },
      });
    });

    return {
      linked: false,
      member,
    };
  }

  async updateMember(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceMemberDto,
    actorRole: WorkspaceRole,
  ) {
    const membership = await this.findMembershipOrThrow(workspaceId, userId);

    if (dto.role) {
      if (membership.role === WorkspaceRole.OWNER && dto.role !== WorkspaceRole.OWNER) {
        const ownerCount = await this.prisma.workspaceMember.count({
          where: { workspaceId, role: WorkspaceRole.OWNER },
        });
        if (ownerCount <= 1) {
          throw new ForbiddenException(
            'Não é possível rebaixar o único owner do workspace',
          );
        }
      }

      if (actorRole !== WorkspaceRole.OWNER && dto.role === WorkspaceRole.OWNER) {
        throw new ForbiddenException('Apenas owners podem promover a owner');
      }
    }

    return this.prisma.workspaceMember.update({
      where: { id: membership.id },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          },
        },
      },
    });
  }

  async removeMember(
    workspaceId: string,
    userId: string,
    actorRole: WorkspaceRole,
  ) {
    if (actorRole !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Apenas owners podem remover membros');
    }

    const membership = await this.findMembershipOrThrow(workspaceId, userId);

    if (membership.role === WorkspaceRole.OWNER) {
      const ownerCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Não é possível remover o único owner do workspace',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.delete({ where: { id: membership.id } });
      const userDeleted = await this.deleteUserIfOrphaned(tx, userId);

      return {
        data: 'Membro removido do workspace.',
        userDeleted,
      };
    });
  }

  async getWorkspacesForUserProfile(userId: string, isSuperAdmin: boolean) {
    const workspaces = await this.findAllForUser(userId, isSuperAdmin);
    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      role: w.role,
    }));
  }

  private async deleteUserIfOrphaned(
    tx: Pick<PrismaService, 'workspaceMember' | 'user'>,
    userId: string,
  ): Promise<boolean> {
    const remaining = await tx.workspaceMember.count({ where: { userId } });
    if (remaining > 0) return false;

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.role === 'SUPER_ADMIN') return false;

    await tx.user.delete({ where: { id: userId } });
    return true;
  }

  private async assertWorkspaceExists(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }
    return workspace;
  }

  private async findMembershipOrThrow(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Membro não encontrado neste workspace');
    }
    return membership;
  }
}
