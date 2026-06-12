import { IsEnum } from 'class-validator';
import { WorkspaceRole } from '../../generated/prisma/client.js';

export class UpdateWorkspaceMemberDto {
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
