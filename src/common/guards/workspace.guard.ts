import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_WORKSPACE_KEY } from '../decorators/skip-workspace.decorator';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../modules/prisma/prisma.service';

const WORKSPACE_HEADER = 'x-workspace-id';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipWorkspace = this.reflector.getAllAndOverride<boolean>(
      SKIP_WORKSPACE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipWorkspace) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Token não fornecido ou inválido');
    }

    const workspaceId = this.extractWorkspaceId(request);
    if (!workspaceId) {
      throw new BadRequestException(
        `Header ${WORKSPACE_HEADER} é obrigatório para esta rota`,
      );
    }

    if (user.role === 'SUPER_ADMIN') {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        throw new NotFoundWorkspace(workspaceId);
      }

      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: user.sub },
        },
      });

      request.workspace = {
        workspaceId,
        role: membership?.role ?? WorkspaceRole.OWNER,
      };
      return true;
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: user.sub },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Você não tem acesso a este workspace');
    }

    request.workspace = {
      workspaceId,
      role: membership.role,
    };

    return true;
  }

  private extractWorkspaceId(request: Request): string | undefined {
    const raw = request.headers[WORKSPACE_HEADER];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
    return undefined;
  }
}

class NotFoundWorkspace extends BadRequestException {
  constructor(workspaceId: string) {
    super(`Workspace não encontrado: ${workspaceId}`);
  }
}
