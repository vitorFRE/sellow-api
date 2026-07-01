import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from 'common/guards/roles.guard';
import { Roles } from 'common/decorators/roles.decorator';
import {
  PaginationQueryDto,
  resolvePagination,
} from 'common/dto/pagination-query.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    const { page, limit } = resolvePagination(query);
    return this.usersService.findAll(page, limit);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findByIdSafe(id);
  }
}
