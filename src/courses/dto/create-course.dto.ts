import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  IsUUID,
  IsInt,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum CourseLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export enum CourseCategory {
  FEATURED = 'Featured',
  SCHOLARX = 'ScholarX',
  ENGINEERING = 'Engineering',
  DESIGN = 'Design',
  BACKEND = 'Backend',
  SYSTEMS = 'Systems',
}

export enum CourseStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsEnum(CourseCategory, {
    message: 'Category must be either Featured or ScholarX',
  })
  category: CourseCategory;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  currentPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  videoPreviewUrl?: string;

  @IsOptional()
  @IsBoolean()
  isBestseller?: boolean;

  @IsOptional()
  @IsString()
  urgencyText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  requiresForm?: boolean;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @IsOptional()
  @IsEnum(CourseStatus, {
    message: 'Status must be either active or inactive',
  })
  status?: CourseStatus;
}
