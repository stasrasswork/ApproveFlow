export type WorkspaceRole = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'CLIENT_VIEW';

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type TaskStatus =
  | 'BRIEF'
  | 'PRODUCTION'
  | 'INTERNAL_REVIEW'
  | 'CLIENT_HANDOFF'
  | 'CLIENT_APPROVAL'
  | 'PENDING_CLOSURE'
  | 'DONE';

export type UserBrief = {
  id: string;
  email: string;
  name: string | null;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type MeWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
};

export type MeResult = {
  id: string;
  email: string;
  name: string | null;
  workspaces: MeWorkspace[];
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceWithRole = Workspace & {
  role: WorkspaceRole;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  user: UserBrief;
};

export type ClientOutsideProject = UserBrief & { userId: string };

export type InviteWorkspaceResult =
  | { status: 'added'; member: WorkspaceMember }
  | { status: 'pending'; message: string; inviteToken?: string };

export type Notification = {
  id: string;
  userId: string;
  type: 'TASK_CLIENT_HANDOFF' | 'TASK_UPDATE' | 'WORKSPACE_INVITE';
  title: string;
  body: string;
  taskId: string | null;
  projectId: string | null;
  workspaceId?: string | null;
  read: boolean;
  createdAt: string;
};

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProjectStats = {
  clientHandoff: number;
  clientApproval: number;
  notDone: number;
  overdueDue: number;
};

export type ProjectActivityItem =
  | {
      type: 'status_changed';
      id: string;
      occurredAt: string;
      taskId: string;
      taskTitle: string;
      actor: UserBrief;
      actorRole: WorkspaceRole | null;
      eventType: string;
      fromStatus: TaskStatus;
      toStatus: TaskStatus;
      approvalType: string | null;
      comment: string | null;
    }
  | {
      type: 'comment';
      id: string;
      occurredAt: string;
      taskId: string;
      taskTitle: string;
      author: UserBrief;
      authorRole: WorkspaceRole | null;
      body: string;
    }
  | {
      type: 'due_changed';
      id: string;
      occurredAt: string;
      taskId: string;
      taskTitle: string;
      changedBy: UserBrief;
      changedByRole: WorkspaceRole | null;
      oldDueAt: string | null;
      newDueAt: string | null;
      reason: string | null;
    };

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  createdAt: string;
  user: UserBrief;
};

type TaskBrief = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  creatorId: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskView = TaskBrief & {
  assignee: UserBrief | null;
  creator: UserBrief;
};

export type TaskEvent = {
  id: string;
  taskId: string;
  actorId: string;
  type: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  approvalType: string | null;
  comment: string | null;
  createdAt: string;
  actor: UserBrief;
};

export type TaskDueChange = {
  id: string;
  taskId: string;
  changedById: string;
  oldDueAt: string | null;
  newDueAt: string | null;
  reason: string | null;
  createdAt: string;
  changedBy: UserBrief;
};

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: UserBrief;
  authorRole: WorkspaceRole;
};

export type AllowedTransitions = {
  from: TaskStatus;
  targets: Array<{
    to: TaskStatus;
    label: string;
    requiresComment: boolean;
    buttonVariant: 'primary' | 'danger' | 'secondary';
  }>;
};
