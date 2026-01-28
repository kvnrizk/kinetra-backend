import {
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExerciseDto {
  @IsString()
  exerciseId: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  sets: number;

  @IsString()
  reps: string; // Allows "8-12", "AMRAP", "15", etc.

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsInt()
  @Min(0)
  order: number;
}

export class WorkoutDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseDto)
  exercises: ExerciseDto[];
}

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutDto)
  workouts: WorkoutDto[];
}

// New DTO for creating plans with weeks (template-style)
export class CreatePlanWithWeeksDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  durationWeeks: number;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsInt()
  basePrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
