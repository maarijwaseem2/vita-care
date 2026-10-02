import {
  BadRequestException,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { UPLOAD_DIR } from '../../config/uploads';
import { DoctorsService } from './doctors.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { QueryDoctorsDto } from './dto/query-doctors.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  /** GET /doctors?city=&specialty=&search= — public doctor search. */
  @Get()
  findAll(@Query() query: QueryDoctorsDto) {
    return this.doctorsService.findAll(query);
  }

  @Get('cities')
  listCities() {
    return this.doctorsService.listCities();
  }

  /** The logged-in doctor's own profile. Placed before ":id" so it isn't shadowed. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Get('me/profile')
  myProfile(@CurrentUser() user: AuthUser) {
    return this.doctorsService.findByUserId(user.userId);
  }

  /** POST /doctors/me/photo — the signed-in doctor uploads a profile photo (JPG/PNG/WEBP, max 2 MB). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Post('me/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `doctor-${randomUUID()}${extname(file.originalname).toLowerCase() || '.jpg'}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Only JPG, PNG or WEBP photos are allowed'), false),
    }),
  )
  async uploadPhoto(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('Choose a photo to upload');
    return this.doctorsService.setPhoto(user.userId, `/uploads/${file.filename}`);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.doctorsService.update(id, dto, user.userId);
  }
}
