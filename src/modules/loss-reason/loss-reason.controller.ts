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
import { RolesGuard } from 'common/guards/roles.guard';
import { Roles } from 'common/decorators/roles.decorator';
import { LossReasonService } from './loss-reason.service';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';
import { UpdateLossReasonDto } from './dto/update-loss-reason.dto';

@Controller('loss-reasons')
export class LossReasonController {
  constructor(private readonly lossReasonService: LossReasonService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('create')
  create(@Body() dto: CreateLossReasonDto) {
    return this.lossReasonService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.lossReasonService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.lossReasonService.findByIdSafe(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLossReasonDto,
  ) {
    return this.lossReasonService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lossReasonService.remove(id);
  }
}
