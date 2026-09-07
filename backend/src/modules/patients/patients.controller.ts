import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateMedicalHistoryDto } from './dto/create-medical-history.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

// Every patient route requires a logged-in patient.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PATIENT)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /** The logged-in patient's own profile + medical history. */
  @Get('me')
  myProfile(@CurrentUser() user: AuthUser) {
    return this.patientsService.findByUserId(user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientsService.update(id, dto, user.userId);
  }

  @Post(':id/medical-history')
  addHistory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMedicalHistoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientsService.addMedicalHistory(id, dto, user.userId);
  }

  @Delete(':id/medical-history/:historyId')
  removeHistory(
    @Param('id', ParseIntPipe) id: number,
    @Param('historyId', ParseIntPipe) historyId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientsService.removeMedicalHistory(id, historyId, user.userId);
  }
}
