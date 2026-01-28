import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMeasurementDto {
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  bodyFatPct?: number;

  @IsOptional()
  @IsNumber()
  chestCm?: number;

  @IsOptional()
  @IsNumber()
  waistCm?: number;

  @IsOptional()
  @IsNumber()
  hipsCm?: number;

  @IsOptional()
  @IsNumber()
  leftArmCm?: number;

  @IsOptional()
  @IsNumber()
  rightArmCm?: number;

  @IsOptional()
  @IsNumber()
  leftThighCm?: number;

  @IsOptional()
  @IsNumber()
  rightThighCm?: number;

  @IsOptional()
  @IsNumber()
  leftCalfCm?: number;

  @IsOptional()
  @IsNumber()
  rightCalfCm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
