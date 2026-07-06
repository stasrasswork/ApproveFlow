import { TaskStatus } from '../generated/prisma/client.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import { TaskNotificationsService } from './task-notifications.service.js';

describe('TaskNotificationsService', () => {
  let service: TaskNotificationsService;
  let notifications: {
    notifyProjectMembers: jest.Mock;
  };
  let db: {
    notification: { createMany: jest.Mock };
    user: { findUnique: jest.Mock };
    projectMember: { findMany: jest.Mock };
  };

  const taskContext = {
    taskId: 'task-1',
    projectId: 'proj-1',
    workspaceId: 'ws-1',
    taskTitle: 'Banner',
    projectName: 'Demo',
  };

  const actor = {
    id: 'user-1',
    email: 'manager@test.local',
    name: 'Manager',
  };

  beforeEach(() => {
    notifications = {
      notifyProjectMembers: jest.fn().mockResolvedValue(undefined),
    };
    db = {
      notification: { createMany: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue(actor) },
      projectMember: { findMany: jest.fn() },
    };
    service = new TaskNotificationsService(
      notifications as unknown as NotificationsService,
    );
  });

  const notifyDb = () =>
    db as unknown as Parameters<TaskNotificationsService['notifyCreated']>[0];

  it('notifies on task creation', async () => {
    await service.notifyCreated(notifyDb(), 'user-1', actor, taskContext);

    expect(notifications.notifyProjectMembers).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        title: 'New task created',
        body: expect.stringContaining('Banner'),
      }),
    );
  });

  it('uses handoff notification type when sent to client', async () => {
    await service.notifyStatusChanged(
      notifyDb(),
      'user-1',
      actor,
      taskContext,
      TaskStatus.INTERNAL_REVIEW,
      TaskStatus.CLIENT_HANDOFF,
    );

    expect(notifications.notifyProjectMembers).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        title: 'Task sent for client review',
        type: 'TASK_CLIENT_HANDOFF',
      }),
    );
  });

  it('formats due date changes', async () => {
    await service.notifyDueChanged(
      notifyDb(),
      'user-1',
      actor,
      taskContext,
      new Date('2030-06-01T12:00:00.000Z'),
    );

    expect(notifications.notifyProjectMembers).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        title: 'Due date changed',
        body: expect.stringContaining('2030-06-01'),
      }),
    );
  });

  it('falls back to email when actor name is missing', () => {
    expect(service.displayUserName(null)).toBe('Someone');
    expect(
      service.displayUserName({ id: 'u', email: 'a@test.local', name: null }),
    ).toBe('a@test.local');
  });

  it('loads actor from database', async () => {
    const result = await service.loadActor(
      db as unknown as Parameters<TaskNotificationsService['loadActor']>[0],
      'user-1',
    );

    expect(db.user.findUnique).toHaveBeenCalled();
    expect(result).toEqual(actor);
  });
});
