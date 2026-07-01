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
import { resolvePagination } from 'common/dto/pagination-query.dto';
import { LeadService } from './lead.service';
import { LeadImportService } from './lead-import.service';
import { RolesGuard } from 'common/guards/roles.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ImportLeadsBodyDto } from './dto/import-leads-body.dto';
import { LeadListFilters, ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpsertLeadNotesDto } from './dto/upsert-lead-notes.dto';
import { UpsertLeadFollowUpDto } from './dto/upsert-lead-follow-up.dto';
import { Roles } from 'common/decorators/roles.decorator';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadService: LeadService,
    private readonly leadImportService: LeadImportService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('create')
  create(@Body() dto: CreateLeadDto) {
    return this.leadService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('import/google-maps')
  importFromGoogleMaps(@Body() body: ImportLeadsBodyDto) {
    return this.leadImportService.importFromGoogleMaps(body.items);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query() query: ListLeadsQueryDto) {
    const { page, limit } = resolvePagination(query);
    const filters: LeadListFilters = {
      status: query.status,
      search: query.search,
      minTotalScore: query.minTotalScore,
      minReviewsCount: query.minReviewsCount,
      hasWebsite: query.hasWebsite,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    };
    return this.leadService.findAll(page, limit, filters);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadService.updateStatus(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete('delete/:id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadService.remove(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id/notes')
  getNotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadService.getNotes(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Put(':id/notes')
  upsertNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertLeadNotesDto,
  ) {
    return this.leadService.upsertNotes(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id/follow-up')
  getFollowUp(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadService.getFollowUp(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Put(':id/follow-up')
  upsertFollowUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertLeadFollowUpDto,
  ) {
    return this.leadService.upsertFollowUp(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id/follow-up')
  clearFollowUp(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadService.clearFollowUp(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadService.findByIdSafe(id);
  }
}
