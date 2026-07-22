import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../../common/decorators/workspace-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { WorkspaceContext } from '../../common/types/workspace-context.type';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { StartGoogleMapsLeadsRunDto } from './dto/start-google-maps-leads-run.dto';
import { IntegrationRunService } from './integration-run.service';

@Controller('integrations/google-maps-leads')
@UseGuards(WorkspaceRolesGuard)
export class GoogleMapsLeadsController {
  constructor(private readonly runService: IntegrationRunService) {}

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Post('runs')
  startRun(
    @CurrentUser() user: JwtPayload,
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: StartGoogleMapsLeadsRunDto,
  ) {
    return this.runService.startGoogleMapsLeadsRun(
      workspace.workspaceId,
      user.sub,
      dto,
    );
  }
}
