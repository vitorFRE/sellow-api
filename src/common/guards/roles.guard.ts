import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from 'common/decorators/roles.decorator';
import { Request } from 'express';

// Requer que o usuário já tenha sido autenticado (ex.: JwtAuthGuard)
// antes de chegar aqui; se não houver user, retorna 401.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<Request>();

    if (!user) {
      throw new UnauthorizedException('Token não fornecido ou inválido');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Acesso negado: permissão insuficiente');
    }

    return true;
  }
}
