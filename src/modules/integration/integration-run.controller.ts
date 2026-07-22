import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../../common/decorators/workspace-roles.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { WorkspaceContext } from '../../common/types/workspace-context.type';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { ListIntegrationRunsQueryDto } from './dto/list-integration-runs-query.dto';
import { IntegrationRunService } from './integration-run.service';

@Controller('integrations/runs')
@UseGuards(WorkspaceRolesGuard)
export class IntegrationRunController {
  constructor(private readonly runService: IntegrationRunService) {}

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Get()
  list(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Query() query: ListIntegrationRunsQueryDto,
  ) {
    return this.runService.list(workspace.workspaceId, query);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Get(':id')
  findOne(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.runService.findOne(workspace.workspaceId, id);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Post(':id/abort')
  abort(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.runService.abort(workspace.workspaceId, id);
  }
}
