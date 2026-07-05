import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { TaskView } from '../../api/types';
import { userDisplayName, formatDate, formatDaysUntil } from '../../lib/format';
import { getBlockingHint } from '../../lib/task-status';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DatePickerInput } from '../ui/DatePickerInput';
import { Dropdown } from '../ui/Dropdown';
import { EmptyState } from '../ui/EmptyState';
import { Input, Textarea, Field, FormStack, FormActions } from '../ui/Form';
import { LoadingState } from '../ui/LoadingState';
import { PageError } from '../ui/PageError';
import { StatusBadge } from '../ui/StatusBadge';

type DropdownOption = { value: string; label: string };

type ProjectTasksSectionProps = {
  workspaceId: string;
  projectId: string;
  tasks: TaskView[];
  tasksLoading: boolean;
  tasksError: boolean;
  canCreateTask: boolean;
  showCreateTask: boolean;
  taskTitle: string;
  taskDescription: string;
  taskDueDate: string;
  assigneeId: string;
  assigneeOptions: DropdownOption[];
  showAssigneeAccessHint: boolean;
  createPending: boolean;
  onToggleCreateTask: () => void;
  onTaskTitleChange: (value: string) => void;
  onTaskDescriptionChange: (value: string) => void;
  onTaskDueDateChange: (value: string) => void;
  onAssigneeIdChange: (value: string) => void;
  onCreateTask: (event: FormEvent) => void;
};

export function ProjectTasksSection({
  workspaceId,
  projectId,
  tasks,
  tasksLoading,
  tasksError,
  canCreateTask,
  showCreateTask,
  taskTitle,
  taskDescription,
  taskDueDate,
  assigneeId,
  assigneeOptions,
  showAssigneeAccessHint,
  createPending,
  onToggleCreateTask,
  onTaskTitleChange,
  onTaskDescriptionChange,
  onTaskDueDateChange,
  onAssigneeIdChange,
  onCreateTask,
}: ProjectTasksSectionProps) {
  return (
    <Card
      title="Tasks"
      accent="blue"
      actions={
        canCreateTask ? (
          <Button type="button" onClick={onToggleCreateTask}>
            {showCreateTask ? 'Cancel' : '+ New task'}
          </Button>
        ) : undefined
      }
    >
      {showCreateTask ? (
        <div className="mb-5 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4">
          <form onSubmit={onCreateTask}>
            <FormStack>
              <Field label="Title" htmlFor="task-title">
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={(e) => onTaskTitleChange(e.target.value)}
                  required
                />
              </Field>
              <Field label="Description" htmlFor="task-desc">
                <Textarea
                  id="task-desc"
                  value={taskDescription}
                  onChange={(e) => onTaskDescriptionChange(e.target.value)}
                />
              </Field>
              <Field label="Assignee" htmlFor="assignee">
                <Dropdown
                  value={assigneeId}
                  onChange={onAssigneeIdChange}
                  options={assigneeOptions}
                  compactTrigger
                  fullWidth
                />
                {showAssigneeAccessHint ? (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Assignee is not on this project yet — they will be added
                    automatically when you create the task.
                  </p>
                ) : null}
              </Field>
              <Field label="Due date" htmlFor="task-due">
                <DatePickerInput
                  id="task-due"
                  value={taskDueDate}
                  onChange={onTaskDueDateChange}
                  placeholder="Optional"
                />
              </Field>
              <FormActions>
                <Button type="submit" disabled={createPending}>
                  Create task
                </Button>
              </FormActions>
            </FormStack>
          </form>
        </div>
      ) : null}

      {tasksError ? (
        <PageError message="Failed to load tasks." />
      ) : tasksLoading ? (
        <LoadingState />
      ) : tasks.length === 0 ? (
        <EmptyState>No tasks yet. Create one to get started.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const blocking = getBlockingHint(task.status);
            const dueRelative = formatDaysUntil(task.dueAt);
            return (
              <li key={task.id}>
                <Link
                  to={`/w/${workspaceId}/projects/${projectId}/tasks/${task.id}`}
                  className="group block rounded-xl border border-slate-200/70 bg-white px-4 py-3.5 transition hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 group-hover:text-brand-700">
                      {task.title}
                    </span>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {task.assignee
                      ? `Assignee: ${userDisplayName(task.assignee)}`
                      : 'Unassigned'}
                    {task.dueAt
                      ? ` · Due ${formatDate(task.dueAt)}${
                          dueRelative ? ` (${dueRelative})` : ''
                        }`
                      : ''}
                    {blocking ? ` · ${blocking}` : ''}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
