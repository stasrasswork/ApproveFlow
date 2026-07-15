import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TaskStatus, WorkspaceRole } from '../generated/prisma/client.js';
import { TasksTransitionService } from './tasks-transition.service.js';

describe('TasksTransitionService', () => {
  const prisma = {
    task: {
      findUniqueOrThrow: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const taskNotifications = {
    loadActor: jest.fn(),
    notifyStatusChanged: jest.fn(),
  };

  let service: TasksTransitionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TasksTransitionService(
      prisma as never,
      taskNotifications as never,
    );
  });

  it('returns current task for same-status idempotent calls', async () => {
    const taskView = {
      id: 'task-1',
      status: TaskStatus.PRODUCTION,
      assignee: null,
      creator: { id: 'u1', email: 'a@test.local', name: 'A' },
    };
    prisma.task.findUniqueOrThrow.mockResolvedValue(taskView);

    const result = await service.transition(
      {
        id: 'task-1',
        title: 'Banner',
        status: TaskStatus.PRODUCTION,
        project: { id: 'proj-1', workspaceId: 'ws-1' },
      },
      'user-1',
      WorkspaceRole.MANAGER,
      { to: TaskStatus.PRODUCTION },
    );

    expect(result).toEqual({ taskView, mailContext: null });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects forbidden role transitions before writing', async () => {
    await expect(
      service.transition(
        {
          id: 'task-1',
          title: 'Banner',
          status: TaskStatus.BRIEF,
          project: { id: 'proj-1', workspaceId: 'ws-1' },
        },
        'user-1',
        WorkspaceRole.MEMBER,
        { to: TaskStatus.PRODUCTION },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects changes-requested without comment', async () => {
    await expect(
      service.transition(
        {
          id: 'task-1',
          title: 'Banner',
          status: TaskStatus.CLIENT_APPROVAL,
          project: { id: 'proj-1', workspaceId: 'ws-1' },
        },
        'client-1',
        WorkspaceRole.CLIENT_VIEW,
        { to: TaskStatus.PRODUCTION },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
