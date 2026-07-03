import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../../common/decorators/workspace-roles.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { WorkspaceContext } from '../../common/types/workspace-context.type';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { LeadService } from '../lead/lead.service';

@Controller('dashboard')
@UseGuards(WorkspaceRolesGuard)
export class DashboardController {
  constructor(private readonly leadService: LeadService) {}

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER, WorkspaceRole.MEMBER)
  @Get()
  summary(@CurrentWorkspace() workspace: WorkspaceContext) {
    return this.leadService.getDashboardSummary(workspace.workspaceId);
  }
}
