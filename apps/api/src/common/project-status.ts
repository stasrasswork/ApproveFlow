import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';

export async function assertProjectAllowsTaskChanges(
  prisma: PrismaService,
  projectId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true },
  });

  if (!project) {
    throw new NotFoundException(`Project ${projectId} not found`);
  }

  // Project status (ACTIVE / PAUSED / COMPLETED) is informational-only in MVP.
  // Task and comment mutations are governed by the task transition matrix only.
}
