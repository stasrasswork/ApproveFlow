import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token!: string;
}
