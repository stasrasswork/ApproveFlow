import { IsNotEmpty } from 'class-validator';
import { IsCuid } from '../../common/is-cuid.js';

export class AddProjectMemberDto {
  @IsCuid()
  @IsNotEmpty()
  userId!: string;
}
