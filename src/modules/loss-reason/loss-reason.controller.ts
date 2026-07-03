import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../../common/decorators/workspace-roles.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { WorkspaceContext } from '../../common/types/workspace-context.type';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { LossReasonService } from './loss-reason.service';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';
import { UpdateLossReasonDto } from './dto/update-loss-reason.dto';

@Controller('loss-reasons')
@UseGuards(WorkspaceRolesGuard)
export class LossReasonController {
  constructor(private readonly lossReasonService: LossReasonService) {}

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Post('create')
  create(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: CreateLossReasonDto,
  ) {
    return this.lossReasonService.create(workspace.workspaceId, dto);
  }

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER, WorkspaceRole.MEMBER)
  @Get()
  findAll(@CurrentWorkspace() workspace: WorkspaceContext) {
    return this.lossReasonService.findAll(workspace.workspaceId);
  }

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER, WorkspaceRole.MEMBER)
  @Get(':id')
  getById(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.lossReasonService.findByIdSafe(workspace.workspaceId, id);
  }

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Patch(':id')
  update(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLossReasonDto,
  ) {
    return this.lossReasonService.update(workspace.workspaceId, id, dto);
  }

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Delete(':id')
  remove(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.lossReasonService.remove(workspace.workspaceId, id);
  }
}
