import { IsString, IsOptional } from 'class-validator';

export class AssignPlanDto {
  @IsString()
  clientUserId: string;

  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
