import type { FormEvent } from 'react';
import type { AllowedTransitions, ClientOutsideProject } from '../../api/types';
import { ClientHandoffHint } from '../ClientHandoffHint';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DueDatePickerPanel } from '../ui/DueDatePicker';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Textarea, Field, FormStack, FormActions } from '../ui/Form';

type TaskActionsSectionProps = {
  showActionsCard: boolean;
  transitionError: string | null;
  clientsOutside: ClientOutsideProject[];
  showTransitions: boolean;
  transitions: AllowedTransitions | undefined;
  canSetDueDate: boolean;
  showDueDateForm: boolean;
  taskDueAt: string | null;
  quickDueDate: string;
  quickDueReason: string;
  pendingTransition: AllowedTransitions['targets'][number] | null;
  commentBody: string;
  transitionPending: boolean;
  updateDuePending: boolean;
  onTransition: (target: AllowedTransitions['targets'][number]) => void;
  onOpenDueDateForm: () => void;
  onQuickDueDateChange: (value: string) => void;
  onQuickDueReasonChange: (value: string) => void;
  onQuickDueSubmit: (event: FormEvent) => void;
  onCancelDueDateForm: () => void;
  onCommentBodyChange: (value: string) => void;
  onTransitionWithComment: (event: FormEvent) => void;
  onCancelPendingTransition: () => void;
};

export function TaskActionsSection({
  showActionsCard,
  transitionError,
  clientsOutside,
  showTransitions,
  transitions,
  canSetDueDate,
  showDueDateForm,
  taskDueAt,
  quickDueDate,
  quickDueReason,
  pendingTransition,
  commentBody,
  transitionPending,
  updateDuePending,
  onTransition,
  onOpenDueDateForm,
  onQuickDueDateChange,
  onQuickDueReasonChange,
  onQuickDueSubmit,
  onCancelDueDateForm,
  onCommentBodyChange,
  onTransitionWithComment,
  onCancelPendingTransition,
}: TaskActionsSectionProps) {
  return (
    <>
      {showActionsCard ? (
        <Card title="Actions" accent="violet">
          {transitionError ? (
            <ErrorAlert message={transitionError} className="mb-3" />
          ) : null}
          <ClientHandoffHint clients={clientsOutside} />
          <div className="mt-3 flex flex-wrap gap-2">
            {showTransitions
              ? transitions!.targets.map((target) => (
                  <Button
                    key={target.to}
                    variant={target.buttonVariant}
                    disabled={transitionPending || updateDuePending}
                    onClick={() => onTransition(target)}
                  >
                    {target.label}
                  </Button>
                ))
              : null}
            {canSetDueDate && !showDueDateForm ? (
              <Button
                type="button"
                variant="secondary"
                disabled={transitionPending || updateDuePending}
                onClick={onOpenDueDateForm}
              >
                {taskDueAt ? 'Change due date' : 'Set due date'}
              </Button>
            ) : null}
          </div>
          {showDueDateForm ? (
            <DueDatePickerPanel
              dueDate={quickDueDate}
              onDueDateChange={onQuickDueDateChange}
              reason={quickDueReason}
              onReasonChange={onQuickDueReasonChange}
              onSubmit={onQuickDueSubmit}
              onCancel={onCancelDueDateForm}
              isPending={updateDuePending}
            />
          ) : null}
        </Card>
      ) : null}

      {pendingTransition ? (
        <Card title="Comment required" accent="rose">
          <form onSubmit={onTransitionWithComment}>
            <FormStack>
              <Field label="Comment">
                <Textarea
                  value={commentBody}
                  onChange={(e) => onCommentBodyChange(e.target.value)}
                  placeholder="Describe what needs to be changed"
                  required
                />
              </Field>
              <FormActions>
                <Button type="submit" disabled={transitionPending}>
                  {pendingTransition.label}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancelPendingTransition}
                >
                  Cancel
                </Button>
              </FormActions>
            </FormStack>
          </form>
        </Card>
      ) : null}
    </>
  );
}
