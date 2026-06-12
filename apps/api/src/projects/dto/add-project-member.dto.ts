import { IsNotEmpty, IsString } from 'class-validator';

export class AddProjectMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
