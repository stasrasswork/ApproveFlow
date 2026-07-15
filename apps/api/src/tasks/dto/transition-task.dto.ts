import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsCuid } from '../../common/is-cuid.js';
import { TaskStatus } from '../../generated/prisma/client.js';

export class TransitionTaskDto {
  @IsEnum(TaskStatus)
  to!: TaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsCuid({ each: true })
  clientUserIds?: string[];
}
