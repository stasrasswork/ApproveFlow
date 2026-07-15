import { hash } from 'argon2';
import {
  PrismaClient,
  TaskStatus,
  WorkspaceRole,
} from '../src/generated/prisma/client';

export const SEED_PASSWORD = 'password123';

/** Stable cuid-shaped ids for deterministic e2e seed data (25 chars). */
export const SEED_IDS = {
  admin: 'c000000000000000000000001',
  manager: 'c000000000000000000000002',
  client: 'c000000000000000000000003',
  member: 'c000000000000000000000004',
  workspace: 'c000000000000000000000005',
  project: 'c000000000000000000000006',
  taskMemberDemo: 'c000000000000000000000007',
  taskClientHandoff: 'c000000000000000000000008',
  taskClientApproval: 'c000000000000000000000009',
  taskPendingClosure: 'c000000000000000000000010',
} as const;

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const passwordHash = await hash(SEED_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.local' },
    update: { name: 'Admin', passwordHash },
    create: {
      id: SEED_IDS.admin,
      email: 'admin@test.local',
      passwordHash,
      name: 'Admin',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@test.local' },
    update: { name: 'Manager', passwordHash },
    create: {
      id: SEED_IDS.manager,
      email: 'manager@test.local',
      passwordHash,
      name: 'Manager',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@test.local' },
    update: { name: 'Client', passwordHash },
    create: {
      id: SEED_IDS.client,
      email: 'client@test.local',
      passwordHash,
      name: 'Client',
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@test.local' },
    update: { name: 'Member', passwordHash },
    create: {
      id: SEED_IDS.member,
      email: 'member@test.local',
      passwordHash,
      name: 'Member',
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo' },
    update: { name: 'Demo workspace' },
    create: {
      id: SEED_IDS.workspace,
      name: 'Demo workspace',
      slug: 'demo',
    },
  });

  const workspaceMembers = [
    { userId: admin.id, role: WorkspaceRole.ADMIN },
    { userId: manager.id, role: WorkspaceRole.MANAGER },
    { userId: client.id, role: WorkspaceRole.CLIENT_VIEW },
    { userId: member.id, role: WorkspaceRole.MEMBER },
  ] as const;

  for (const { userId, role } of workspaceMembers) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId,
        },
      },
      update: { role },
      create: {
        workspaceId: workspace.id,
        userId,
        role,
      },
    });
  }

  const project = await prisma.project.upsert({
    where: { id: SEED_IDS.project },
    update: { name: 'Demo project' },
    create: {
      id: SEED_IDS.project,
      workspaceId: workspace.id,
      name: 'Demo project',
      description: 'Seed data for local API checks',
    },
  });

  for (const userId of [admin.id, manager.id, client.id, member.id]) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId,
        },
      },
      update: {},
      create: {
        projectId: project.id,
        userId,
      },
    });
  }

  const seedTasks = [
    {
      id: SEED_IDS.taskMemberDemo,
      title: 'Задача для member',
      description: 'Member видит только назначенные задачи',
      status: TaskStatus.PRODUCTION,
      assigneeId: member.id,
    },
    {
      id: SEED_IDS.taskClientHandoff,
      title: 'Ожидает приёма клиентом',
      description: 'client_handoff → client принимает к согласованию',
      status: TaskStatus.CLIENT_HANDOFF,
      assigneeId: member.id,
    },
    {
      id: SEED_IDS.taskClientApproval,
      title: 'На согласовании у клиента',
      description: 'client_approval → approve или request changes',
      status: TaskStatus.CLIENT_APPROVAL,
      assigneeId: member.id,
    },
    {
      id: SEED_IDS.taskPendingClosure,
      title: 'Клиент согласовал, ждёт закрытия',
      description: 'pending_closure → done (admin/manager)',
      status: TaskStatus.PENDING_CLOSURE,
      assigneeId: null,
    },
  ] as const;

  for (const task of seedTasks) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: {
        title: task.title,
        description: task.description,
        status: task.status,
        assigneeId: task.assigneeId,
      },
      create: {
        id: task.id,
        projectId: project.id,
        title: task.title,
        description: task.description,
        status: task.status,
        creatorId: manager.id,
        assigneeId: task.assigneeId,
      },
    });
  }
}
