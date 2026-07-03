import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { resolvePagination } from '../../common/dto/pagination-query.dto';
import { LeadService } from './lead.service';
import { LeadImportService } from './lead-import.service';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ImportLeadsBodyDto } from './dto/import-leads-body.dto';
import { LeadListFilters, ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpdateLeadImportReviewDto } from './dto/update-lead-import-review.dto';
import { UpsertLeadNotesDto } from './dto/upsert-lead-notes.dto';
import { UpsertLeadFollowUpDto } from './dto/upsert-lead-follow-up.dto';
import { WorkspaceRoles } from '../../common/decorators/workspace-roles.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { WorkspaceContext } from '../../common/types/workspace-context.type';
import { WorkspaceRole } from '../../generated/prisma/enums';

@Controller('leads')
@UseGuards(WorkspaceRolesGuard)
export class LeadsController {
  constructor(
    private readonly leadService: LeadService,
    private readonly leadImportService: LeadImportService,
  ) {}

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Post('create')
  create(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadService.create(workspace.workspaceId, dto);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Post('import/google-maps')
  importFromGoogleMaps(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() body: ImportLeadsBodyDto,
  ) {
    return this.leadImportService.importFromGoogleMaps(
      workspace.workspaceId,
      body.items,
    );
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Get()
  findAll(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Query() query: ListLeadsQueryDto,
  ) {
    const { page, limit } = resolvePagination(query);
    const filters: LeadListFilters = {
      status: query.status,
      search: query.search,
      minTotalScore: query.minTotalScore,
      minReviewsCount: query.minReviewsCount,
      hasWebsite: query.hasWebsite,
      importReview: query.importReview,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    };
    return this.leadService.findAll(
      workspace.workspaceId,
      page,
      limit,
      filters,
    );
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Patch(':id/status')
  updateStatus(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadService.updateStatus(workspace.workspaceId, id, dto);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Patch(':id/import-review')
  updateImportReview(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadImportReviewDto,
  ) {
    return this.leadService.updateImportReview(workspace.workspaceId, id, dto);
  }

  @WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.OWNER)
  @Delete('delete/:id')
  delete(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadService.remove(workspace.workspaceId, id);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Get(':id/notes')
  getNotes(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadService.getNotes(workspace.workspaceId, id);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Put(':id/notes')
  upsertNotes(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertLeadNotesDto,
  ) {
    return this.leadService.upsertNotes(workspace.workspaceId, id, dto);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Get(':id/follow-up')
  getFollowUp(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadService.getFollowUp(workspace.workspaceId, id);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Put(':id/follow-up')
  upsertFollowUp(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertLeadFollowUpDto,
  ) {
    return this.leadService.upsertFollowUp(workspace.workspaceId, id, dto);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Delete(':id/follow-up')
  clearFollowUp(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadService.clearFollowUp(workspace.workspaceId, id);
  }

  @WorkspaceRoles(
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
    WorkspaceRole.MEMBER,
  )
  @Get(':id')
  getById(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadService.findByIdSafe(workspace.workspaceId, id);
  }
}
