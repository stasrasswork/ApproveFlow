import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { WorkspaceRole } from '../../generated/prisma/client.js';

export class InviteWorkspaceMemberDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
