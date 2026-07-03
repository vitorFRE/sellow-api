import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { WorkspaceContext } from '../types/workspace-context.type';

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.workspace) {
      throw new Error('Workspace context not available on request');
    }
    return request.workspace;
  },
);
