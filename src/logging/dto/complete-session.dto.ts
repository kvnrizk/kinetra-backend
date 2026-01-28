import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SetLogDto {
  @IsString()
  workoutExerciseId: string;

  @IsNumber()
  setNumber: number;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsNumber()
  @IsOptional()
  reps?: number;

  @IsOptional()
  @IsNumber()
  rpe?: number;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}

export class CompleteSessionDto {
  @IsString()
  workoutId: string;

  @IsOptional()
  @IsString()
  planWeekWorkoutId?: string; // Track which specific day's workout

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetLogDto)
  logs: SetLogDto[];

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsBoolean()
  painFlag: boolean;

  @IsOptional()
  @IsString()
  painDetails?: string;
}
