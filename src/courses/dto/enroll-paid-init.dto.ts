import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class EnrollPaidInitDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceSurface?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  currency?: string;

  @IsOptional()
  @IsUrl()
  returnUrl?: string;
}
