import { IsString, IsOptional, IsInt, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class UpdateTrainerProfileDto {
  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  yearsExperience?: number;

  @IsOptional()
  @IsBoolean()
  remoteAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptsInGym?: boolean;

  @IsOptional()
  @IsString()
  baseCity?: string;

  @IsOptional()
  @IsString()
  baseCountry?: string;

  @IsOptional()
  @IsNumber()
  sessionPriceMin?: number;

  @IsOptional()
  @IsNumber()
  sessionPriceMax?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];
}
