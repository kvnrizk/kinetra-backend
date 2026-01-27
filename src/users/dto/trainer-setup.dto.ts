import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class TrainerSetupDto {
  @IsString()
  @IsOptional()
  headline?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  yearsExperience?: number;

  @IsBoolean()
  @IsOptional()
  remoteAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  acceptsInGym?: boolean;

  @IsString()
  @IsOptional()
  baseCity?: string;

  @IsString()
  @IsOptional()
  baseCountry?: string;

  @IsNumber()
  @IsOptional()
  sessionPriceMin?: number;

  @IsNumber()
  @IsOptional()
  sessionPriceMax?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  instagramHandle?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];
}
