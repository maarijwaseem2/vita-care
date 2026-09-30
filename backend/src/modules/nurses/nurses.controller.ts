import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NursesService } from './nurses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { CompleteVisitDto, CreateHomeCareDto, DoctorOrderDto, NurseQuery, UpdateNurseDto } from './dto/nurse.dto';

@Controller('nurses')
export class NursesController {
  constructor(private readonly svc: NursesService) {}

  /** Public: verified nurses (no phone numbers). */
  @Get()
  list(@Query() q: NurseQuery) {
    return this.svc.listVerified(q);
  }

  @Get('services')
  services() {
    return this.svc.services();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NURSE)
  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.svc.me(u);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NURSE)
  @Patch('me')
  updateMe(@CurrentUser() u: AuthUser, @Body() dto: UpdateNurseDto) {
    return this.svc.updateMe(u, dto);
  }
}

@Controller('home-care')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeCareController {
  constructor(private readonly svc: NursesService) {}

  // --- patient ---
  @Roles(UserRole.PATIENT)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateHomeCareDto) {
    return this.svc.create(u, dto);
  }

  @Roles(UserRole.PATIENT)
  @Get('me/patient')
  minePatient(@CurrentUser() u: AuthUser) {
    return this.svc.mineForPatient(u);
  }

  @Roles(UserRole.PATIENT)
  @Patch(':id/cancel')
  cancel(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.svc.cancelByPatient(u, id);
  }

  // --- nurse ---
  @Roles(UserRole.NURSE)
  @Get('nurse/open')
  open(@CurrentUser() u: AuthUser) {
    return this.svc.openForNurse(u);
  }

  @Roles(UserRole.NURSE)
  @Get('nurse/mine')
  mineNurse(@CurrentUser() u: AuthUser) {
    return this.svc.mineForNurse(u);
  }

  @Roles(UserRole.NURSE)
  @Patch(':id/accept')
  accept(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.svc.accept(u, id);
  }

  @Roles(UserRole.NURSE)
  @Patch(':id/decline')
  decline(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.svc.decline(u, id);
  }

  @Roles(UserRole.NURSE)
  @Patch(':id/complete')
  complete(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: CompleteVisitDto) {
    return this.svc.complete(u, id, dto);
  }

  // --- doctor ---
  @Roles(UserRole.DOCTOR)
  @Post('order')
  order(@CurrentUser() u: AuthUser, @Body() dto: DoctorOrderDto) {
    return this.svc.orderByDoctor(u, dto);
  }
}
