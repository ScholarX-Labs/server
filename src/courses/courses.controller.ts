import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Put,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CoursePaginationQueryDto,
  SearchCourseDto,
} from './dto/pagination-query.dto';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { EnrollFreeDto } from './dto/enroll-free.dto';
import { EnrollPaidInitDto } from './dto/enroll-paid-init.dto';
import { EnrollApplicationInitDto } from './dto/enroll-application-init.dto';

// For simplicity, defining a basic mock user decorator.
// In a real app, you'd extract this from the request via `@Req() req` or a custom `@User()` decorator.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.id; // Assuming JWT strat puts user payload on req.user
  },
);

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  private getRequestId(req: Request): string {
    const headerValue = req.headers['x-request-id'];
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue;
    }

    return 'request-id-unavailable';
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.coursesService.createCourse(createCourseDto, image);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: CoursePaginationQueryDto,
    @GetUserId() userId?: string,
  ) {
    return this.coursesService.getCourses(query, userId);
  }

  @Get('featured')
  @UseGuards(OptionalJwtAuthGuard)
  findFeatured(
    @Query() query: CoursePaginationQueryDto,
    @GetUserId() userId?: string,
  ) {
    return this.coursesService.getFeaturedCourses(
      query.page,
      query.limit,
      userId,
    );
  }

  @Get('scholarx')
  @UseGuards(OptionalJwtAuthGuard)
  findScholarX(
    @Query() query: CoursePaginationQueryDto,
    @GetUserId() userId?: string,
  ) {
    return this.coursesService.getScholarXCourses(
      query.page,
      query.limit,
      userId,
    );
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  search(@Query() query: SearchCourseDto) {
    return this.coursesService.searchCourses(query);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  findBySlug(@Param('slug') slug: string, @GetUserId() userId?: string) {
    return this.coursesService.getCourseBySlug(slug, userId);
  }

  @Get(':id/subscription-status')
  @UseGuards(JwtAuthGuard)
  checkSubscriptionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserId() userId: string,
  ) {
    return this.coursesService.checkSubscriptionStatus(id, userId);
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  enroll(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserId() userId: string,
    @Req() req: Request,
  ) {
    return this.coursesService.enrollFree(id, userId, {
      requestId: this.getRequestId(req),
    });
  }

  @Post(':id/enroll/free')
  @UseGuards(JwtAuthGuard)
  enrollFree(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserId() userId: string,
    @Body() body: EnrollFreeDto,
    @Req() req: Request,
  ) {
    return this.coursesService.enrollFree(id, userId, {
      idempotencyKey: body.idempotencyKey,
      sourceSurface: body.sourceSurface,
      requestId: this.getRequestId(req),
    });
  }

  @Post(':id/enroll/paid/init')
  @UseGuards(JwtAuthGuard)
  initPaidEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserId() userId: string,
    @Body() body: EnrollPaidInitDto,
    @Req() req: Request,
  ) {
    return this.coursesService.initPaidEnrollment(id, userId, {
      idempotencyKey: body.idempotencyKey,
      sourceSurface: body.sourceSurface,
      returnUrl: body.returnUrl,
      requestId: this.getRequestId(req),
    });
  }

  @Post(':id/enroll/application/init')
  @UseGuards(JwtAuthGuard)
  initApplicationEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserId() userId: string,
    @Body() body: EnrollApplicationInitDto,
    @Req() req: Request,
  ) {
    return this.coursesService.initApplicationEnrollment(id, userId, {
      idempotencyKey: body.idempotencyKey,
      sourceSurface: body.sourceSurface,
      applicantSeed: body.applicantSeed,
      requestId: this.getRequestId(req),
    });
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserId() userId?: string,
  ) {
    return this.coursesService.getCourseById(id, userId);
  }

  @Put(':id') // Legacy uses patch/put interchangeably, we standardise
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.coursesService.updateCourse(id, updateCourseDto, image);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('image'))
  patchUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.coursesService.updateCourse(id, updateCourseDto, image);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.deleteCourse(id);
  }
}
