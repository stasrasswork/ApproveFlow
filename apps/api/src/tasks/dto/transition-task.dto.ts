import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TaskStatus } from '../../generated/prisma/client.js';

export class TransitionTaskDto {
  @IsEnum(TaskStatus)
  to!: TaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  comment?: string;
}
