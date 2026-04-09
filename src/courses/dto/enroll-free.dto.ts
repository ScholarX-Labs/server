import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EnrollFreeDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceSurface?: string;
}
