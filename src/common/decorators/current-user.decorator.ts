import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';

type UserKey = keyof (JwtPayload & { refreshToken?: string });

export const CurrentUser = createParamDecorator(
  (data: UserKey | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
