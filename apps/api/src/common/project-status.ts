import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Ensures the project exists. Project status is informational-only (ADR 0001). */
export async function assertProjectExists(
  prisma: PrismaService,
  projectId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    throw new NotFoundException(`Project ${projectId} not found`);
  }
}

/** @deprecated Use assertProjectExists — status does not freeze mutations. */
export const assertProjectAllowsTaskChanges = assertProjectExists;
