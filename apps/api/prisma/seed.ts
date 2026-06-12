import 'dotenv/config';
import { hash } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  PrismaClient,
  TaskStatus,
  WorkspaceRole,
} from '../src/generated/prisma/client';

const SEED_PASSWORD = 'password123';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash(SEED_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.local' },
    update: { name: 'Admin', passwordHash },
    create: {
      id: 'user_admin',
      email: 'admin@test.local',
      passwordHash,
      name: 'Admin',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@test.local' },
    update: { name: 'Manager', passwordHash },
    create: {
      id: 'user_manager',
      email: 'manager@test.local',
      passwordHash,
      name: 'Manager',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@test.local' },
    update: { name: 'Client', passwordHash },
    create: {
      id: 'user_client',
      email: 'client@test.local',
      passwordHash,
      name: 'Client',
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@test.local' },
    update: { name: 'Member', passwordHash },
    create: {
      id: 'user_member',
      email: 'member@test.local',
      passwordHash,
      name: 'Member',
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo' },
    update: { name: 'Demo workspace' },
    create: {
      id: 'ws_demo',
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
    where: { id: 'proj_demo' },
    update: { name: 'Demo project' },
    create: {
      id: 'proj_demo',
      workspaceId: workspace.id,
      name: 'Demo project',
      description: 'Seed data for local API checks',
    },
  });

  for (const userId of [
    admin.id,
    manager.id,
    client.id,
    member.id,
  ]) {
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
      id: 'task_member_demo',
      title: 'Задача для member',
      description: 'Member видит только назначенные задачи',
      status: TaskStatus.PRODUCTION,
      assigneeId: member.id,
    },
    {
      id: 'task_client_handoff',
      title: 'Ожидает приёма клиентом',
      description: 'client_handoff → client принимает к согласованию',
      status: TaskStatus.CLIENT_HANDOFF,
      assigneeId: member.id,
    },
    {
      id: 'task_client_approval',
      title: 'На согласовании у клиента',
      description: 'client_approval → approve или request changes',
      status: TaskStatus.CLIENT_APPROVAL,
      assigneeId: member.id,
    },
    {
      id: 'task_pending_closure',
      title: 'Клиент согласовал, ждёт закрытия',
      description: 'pending_closure → done (admin/manager)',
      status: TaskStatus.PENDING_CLOSURE,
      assigneeId: member.id,
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

  console.log('Seed OK:', {
    adminEmail: admin.email,
    managerEmail: manager.email,
    clientEmail: client.email,
    memberEmail: member.email,
    workspaceId: workspace.id,
    projectId: project.id,
    tasks: seedTasks.map((t) => ({ id: t.id, status: t.status })),
    seedPassword: SEED_PASSWORD,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
