import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateTaskDueDto {
  @ValidateIf((o: UpdateTaskDueDto) => o.dueAt !== null)
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  reason?: string;
}
