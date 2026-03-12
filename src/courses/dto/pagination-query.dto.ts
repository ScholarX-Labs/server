import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 3; // Defaulting to legacy 3
}

export class CoursePaginationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  category?: string;
}

export class SearchCourseDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  title?: string;
}
