import { JwtPayload } from '../common/types/jwt-payload.type';
import { WorkspaceContext } from '../common/types/workspace-context.type';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { refreshToken?: string };
      workspace?: WorkspaceContext;
    }
  }
}

export {};
