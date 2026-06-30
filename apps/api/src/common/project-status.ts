import { BadRequestException } from '@nestjs/common';
import { ProjectStatus } from '../generated/prisma/client.js';
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
    return;
  }

  if (project.status === ProjectStatus.COMPLETED) {
    throw new BadRequestException(
      'Task changes are not allowed on a completed project',
    );
  }
}
