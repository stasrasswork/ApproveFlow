import { Injectable } from '@nestjs/common';
import { TaskStatus, type WorkspaceRole } from '../generated/prisma/client.js';
import { buildTaskListWhere } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProjectStats } from './projects.service.js';

@Injectable()
export class ProjectStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(
    projectId: string,
    role: WorkspaceRole,
    userId: string,
  ): Promise<ProjectStats> {
    const taskWhere = buildTaskListWhere(projectId, role, userId);
    const now = new Date();

    const [clientHandoff, clientApproval, notDone, overdueDue] = await Promise.all([
      this.prisma.task.count({
        where: { ...taskWhere, status: TaskStatus.CLIENT_HANDOFF },
      }),
      this.prisma.task.count({
        where: { ...taskWhere, status: TaskStatus.CLIENT_APPROVAL },
      }),
      this.prisma.task.count({
        where: { ...taskWhere, status: { not: TaskStatus.DONE } },
      }),
      this.prisma.task.count({
        where: {
          ...taskWhere,
          status: { not: TaskStatus.DONE },
          dueAt: { lt: now },
        },
      }),
    ]);

    return { clientHandoff, clientApproval, notDone, overdueDue };
  }
}
