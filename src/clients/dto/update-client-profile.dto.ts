import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class UpdateClientProfileDto {
  @IsOptional()
  @IsString()
  mainGoal?: string;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsInt()
  daysPerWeek?: number;

  @IsOptional()
  @IsBoolean()
  hasMedicalIssues?: boolean;

  @IsOptional()
  @IsString()
  medicalNotes?: string;
}
