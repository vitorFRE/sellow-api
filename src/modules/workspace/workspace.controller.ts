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
import { WorkspaceService } from './workspace.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkspaceRoles } from '../../common/decorators/workspace-roles.decorator';
import { SkipWorkspace } from '../../common/decorators/skip-workspace.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { WorkspaceContext } from '../../common/types/workspace-context.type';
import { WorkspaceRole } from '../../generated/prisma/enums';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @SkipWorkspace()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(dto);
  }

  @SkipWorkspace()
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.workspaceService.findAllForUser(
      user.sub,
      user.role === 'SUPER_ADMIN',
    );
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @Get(':id/members')
  findMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.workspaceService.findMembers(id);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddWorkspaceMemberDto,
  ) {
    return this.workspaceService.addMember(id, dto);
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @Patch(':id/members/:userId')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateWorkspaceMemberDto,
    @CurrentWorkspace() workspace: WorkspaceContext,
  ) {
    return this.workspaceService.updateMember(
      id,
      userId,
      dto,
      workspace.role,
    );
  }

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentWorkspace() workspace: WorkspaceContext,
  ) {
    return this.workspaceService.removeMember(id, userId, workspace.role);
  }
}
