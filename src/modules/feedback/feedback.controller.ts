import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { resolvePagination } from '../../common/dto/pagination-query.dto';
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
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ListFeedbackQueryDto } from './dto/list-feedback-query.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(WorkspaceRolesGuard)
  @WorkspaceRoles(
    WorkspaceRole.MEMBER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.OWNER,
  )
  @Post('create')
  create(
    @CurrentUser() user: JwtPayload,
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(user.sub, workspace.workspaceId, dto);
  }

  @SkipWorkspace()
  @Get('mine')
  findMine(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListFeedbackQueryDto,
  ) {
    const { page, limit } = resolvePagination(query);
    return this.feedbackService.findMine(user.sub, page, limit);
  }

  @SkipWorkspace()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get()
  findAllAdmin(@Query() query: ListFeedbackQueryDto) {
    const { page, limit } = resolvePagination(query);
    return this.feedbackService.findAllAdmin(query, page, limit);
  }

  @SkipWorkspace()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id')
  updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.updateAdmin(id, dto);
  }
}
