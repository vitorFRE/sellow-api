import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LeadService } from '../lead/lead.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly leadService: LeadService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  summary() {
    return this.leadService.getDashboardSummary();
  }
}
