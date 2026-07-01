import { JwtPayload } from 'common/types/jwt-payload.type';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { refreshToken?: string };
    }
  }
}

export {};
