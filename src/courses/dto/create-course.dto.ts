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
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum CourseCategory {
  FEATURED = 'Featured',
  SCHOLARX = 'ScholarX',
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
  oldPrice?: number;

  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @IsOptional()
  @IsEnum(CourseStatus, {
    message: 'Status must be either active or inactive',
  })
  status?: CourseStatus;
}
