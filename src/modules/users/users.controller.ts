import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../../common/decorators/workspace-roles.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { WorkspaceContext } from '../../common/types/workspace-context.type';
import { WorkspaceRole } from '../../generated/prisma/enums';
import {
  PaginationQueryDto,
  resolvePagination,
} from '../../common/dto/pagination-query.dto';

@Controller('users')
@UseGuards(WorkspaceRolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Get()
  findAll(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Query() query: PaginationQueryDto,
  ) {
    const { page, limit } = resolvePagination(query);
    return this.usersService.findAllByWorkspace(workspace.workspaceId, page, limit);
  }

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Get(':id')
  findOne(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') id: string,
  ) {
    return this.usersService.findByIdInWorkspace(workspace.workspaceId, id);
  }
}
