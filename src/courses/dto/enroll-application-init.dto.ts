import { IsOptional, IsObject, IsString, MaxLength } from 'class-validator';

export class EnrollApplicationInitDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceSurface?: string;

  @IsOptional()
  @IsObject()
  applicantSeed?: Record<string, unknown>;
}
