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
import { ExerciseDto, WorkoutDto } from './create-plan.dto';

export class UpdateWorkoutDto {
  @IsOptional()
  @IsString()
  id?: string; // If provided, update existing workout

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

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkoutDto)
  workouts?: UpdateWorkoutDto[];
}
