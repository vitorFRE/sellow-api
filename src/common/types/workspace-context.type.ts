import { WorkspaceRole } from '../../generated/prisma/enums';

export type WorkspaceContext = {
  workspaceId: string;
  role: WorkspaceRole;
};
