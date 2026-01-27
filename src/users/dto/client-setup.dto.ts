import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNumber,
} from 'class-validator';

export class ClientSetupDto {
  @IsString()
  @IsOptional()
  mainGoal?: string;

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  daysPerWeek?: number;

  @IsBoolean()
  @IsOptional()
  hasMedicalIssues?: boolean;

  @IsString()
  @IsOptional()
  medicalNotes?: string;

  // Body measurements (optional initial entry)
  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @IsNumber()
  @IsOptional()
  heightCm?: number;

  @IsNumber()
  @IsOptional()
  bodyFatPct?: number;
}
