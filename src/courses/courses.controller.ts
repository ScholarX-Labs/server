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
  @UseInterceptors(CacheInterceptor)
  findAll(
    @Query() query: CoursePaginationQueryDto,
    @GetUserId() userId?: string,
  ) {
    return this.coursesService.getCourses(query, userId);
  }

  @Get('featured')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
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
  @UseInterceptors(CacheInterceptor)
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
  enroll(@Param('id', ParseUUIDPipe) id: string, @GetUserId() userId: string) {
    return this.coursesService.enrollUserToCourse(id, userId);
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
