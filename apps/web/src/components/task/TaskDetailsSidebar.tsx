import type { TaskDueChange, TaskEvent, TaskView } from '../../api/types';
import {
  formatDate,
  formatDateTime,
  userDisplayName,
} from '../../lib/format';
import { getEventTypeLabel } from '../../lib/task-events';
import { STATUS_LABELS } from '../../lib/task-status';
import { Card } from '../ui/Card';
import { Dropdown } from '../ui/Dropdown';
import {
  DueDateDisplay,
  DueDatePickerFields,
} from '../ui/DueDatePicker';
import { Field, FormStack } from '../ui/Form';

type DropdownOption = { value: string; label: string };

type TaskDetailsSidebarProps = {
  task: TaskView;
  isEditing: boolean;
  canEdit: boolean;
  canEditDueDate: boolean;
  editAssigneeId: string;
  editDueDate: string;
  editDueReason: string;
  assigneeOptions: DropdownOption[];
  showAssigneeAccessHint: boolean;
  events: TaskEvent[];
  dueChanges: TaskDueChange[];
  onEditAssigneeChange: (value: string) => void;
  onEditDueDateChange: (value: string) => void;
  onEditDueReasonChange: (value: string) => void;
};

export function TaskDetailsSidebar({
  task,
  isEditing,
  canEdit,
  canEditDueDate,
  editAssigneeId,
  editDueDate,
  editDueReason,
  assigneeOptions,
  showAssigneeAccessHint,
  events,
  dueChanges,
  onEditAssigneeChange,
  onEditDueDateChange,
  onEditDueReasonChange,
}: TaskDetailsSidebarProps) {
  return (
    <div className="space-y-6">
      <Card title="Details" accent="emerald">
        <FormStack>
          <Field label="Assignee">
            {isEditing && canEdit ? (
              <>
                <Dropdown
                  value={editAssigneeId}
                  onChange={onEditAssigneeChange}
                  options={assigneeOptions}
                  compactTrigger
                  fullWidth
                />
                {showAssigneeAccessHint ? (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Assignee is not on this project yet — they will be added
                    automatically when you save.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm font-medium text-slate-800">
                {userDisplayName(task.assignee) || 'Unassigned'}
              </p>
            )}
          </Field>
          <Field label="Created by">
            <p className="text-sm font-medium text-slate-800">
              {userDisplayName(task.creator)}
            </p>
          </Field>
          <Field label="Due date">
            {isEditing && canEdit && canEditDueDate ? (
              <DueDatePickerFields
                dueDate={editDueDate}
                onDueDateChange={onEditDueDateChange}
                reason={editDueReason}
                onReasonChange={onEditDueReasonChange}
                dateId="due"
                reasonId="due-reason"
              />
            ) : (
              <DueDateDisplay dueAt={task.dueAt} />
            )}
          </Field>
        </FormStack>
      </Card>

      <Card title="Status history" accent="violet">
        <ul className="space-y-3 text-sm">
          {events.length === 0 ? (
            <li className="text-slate-500">No history yet.</li>
          ) : (
            events.map((event) => {
              const eventLabel = getEventTypeLabel(
                event.type,
                event.approvalType,
              );
              return (
                <li
                  key={event.id}
                  className="relative border-l-2 border-brand-200 pl-4"
                >
                  <p className="font-medium text-slate-800">
                    {STATUS_LABELS[event.fromStatus]} →{' '}
                    {STATUS_LABELS[event.toStatus]}
                  </p>
                  {eventLabel ? (
                    <p className="mt-0.5 text-xs font-medium text-brand-700">
                      {eventLabel}
                    </p>
                  ) : null}
                  {event.comment ? (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {event.comment}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {userDisplayName(event.actor)} ·{' '}
                    {formatDateTime(event.createdAt)}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </Card>

      {dueChanges.length > 0 ? (
        <Card title="Due date history" accent="amber">
          <ul className="space-y-3 text-sm">
            {dueChanges.map((change) => (
              <li key={change.id}>
                <p className="font-medium">
                  {formatDate(change.oldDueAt)} → {formatDate(change.newDueAt)}
                </p>
                <p className="text-xs text-slate-500">
                  {userDisplayName(change.changedBy)} ·{' '}
                  {formatDateTime(change.createdAt)}
                  {change.reason ? ` · ${change.reason}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
