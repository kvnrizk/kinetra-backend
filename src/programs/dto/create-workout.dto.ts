import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateWorkoutDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  estimatedMinutes?: number;
}

export class CreateWorkoutExerciseDto {
  @IsString()
  exerciseId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  sets?: number;

  @IsOptional()
  @IsString()
  reps?: string;

  @IsOptional()
  @IsInt()
  repsMin?: number;

  @IsOptional()
  @IsInt()
  repsMax?: number;

  @IsOptional()
  @IsInt()
  restSeconds?: number;

  @IsOptional()
  @IsString()
  tempo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsInt()
  orderIndex: number;
}

export class AddWorkoutToWeekDto {
  @IsString()
  workoutId: string;

  @IsInt()
  dayOfWeek: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
