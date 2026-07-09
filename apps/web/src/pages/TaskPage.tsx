import { Link } from 'react-router-dom';
import { TaskActionsSection } from '../components/task/TaskActionsSection';
import { TaskCommentsSection } from '../components/task/TaskCommentsSection';
import { TaskDetailsSidebar } from '../components/task/TaskDetailsSidebar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/LoadingState';
import { PageError } from '../components/ui/PageError';
import { TitleInput, Textarea, InlineFormRow } from '../components/ui/Form';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useTaskPageModel } from './models/useTaskPageModel';

export function TaskPage() {
  const model = useTaskPageModel();

  const {
    workspaceId,
    projectId,
    task,
    taskLoading,
    taskError,
    comments,
    events,
    dueChanges,
    transitions,
    canEditTask,
    isEditing,
    editTitle,
    editDescription,
    editAssigneeId,
    editDueDate,
    editDueReason,
    assigneeOptions,
    showAssigneeAccessHint,
    showActionsCard,
    transitionError,
    handoffClients,
    showHandoffPicker,
    selectedHandoffClientIds,
    showTransitions,
    canSetDueDate,
    showDueDateForm,
    quickDueDate,
    quickDueReason,
    pendingTransition,
    commentBody,
    transitionMutation,
    updateDueMutation,
    commentMutation,
    saveEditMutation,
    newComment,
    blocking,
    setEditTitle,
    setEditDescription,
    setEditAssigneeId,
    setEditDueDate,
    setEditDueReason,
    setSelectedHandoffClientIds,
    setQuickDueDate,
    setQuickDueReason,
    setCommentBody,
    setPendingTransition,
    setNewComment,
    startEditing,
    cancelEditing,
    openDueDateForm,
    cancelDueDateForm,
    handleQuickDueSubmit,
    handleTransition,
    handleTransitionWithComment,
    handleAddComment,
  } = model;

  if (taskLoading) {
    return <LoadingState />;
  }

  if (taskError || !task) {
    return <PageError message="Failed to load task." />;
  }

  const canEditDueDate = canEditTask;

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/w/${workspaceId}/projects/${projectId}`}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to project
        </Link>
        <div className="mt-5">
          <InlineFormRow>
            {isEditing && canEditTask ? (
              <TitleInput
                id="task-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full min-w-0 flex-1 sm:min-w-[12rem]"
                aria-label="Task title"
                required
              />
            ) : (
              <h1 className="min-w-0 break-words text-3xl font-semibold tracking-tight text-slate-900">
                {task.title}
              </h1>
            )}
            <StatusBadge status={task.status} size="md" />
            {canEditTask && isEditing ? (
              <>
                <Button
                  type="button"
                  onClick={() => saveEditMutation.mutate()}
                  disabled={saveEditMutation.isPending}
                >
                  {saveEditMutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEditing}
                  disabled={saveEditMutation.isPending}
                >
                  Cancel
                </Button>
              </>
            ) : null}
            {canEditTask && !isEditing ? (
              <Button type="button" variant="secondary" onClick={startEditing}>
                Edit
              </Button>
            ) : null}
          </InlineFormRow>
        </div>
        {blocking ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            {blocking}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Description" accent="blue">
            {isEditing && canEditTask ? (
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                {task.description || 'No description'}
              </p>
            )}
          </Card>

          <TaskActionsSection
            showActionsCard={showActionsCard}
            transitionError={transitionError}
            handoffClients={handoffClients}
            showHandoffPicker={Boolean(showHandoffPicker)}
            selectedHandoffClientIds={selectedHandoffClientIds}
            onHandoffClientsChange={setSelectedHandoffClientIds}
            showTransitions={showTransitions}
            transitions={transitions}
            canSetDueDate={canSetDueDate}
            showDueDateForm={showDueDateForm}
            taskDueAt={task.dueAt}
            quickDueDate={quickDueDate}
            quickDueReason={quickDueReason}
            pendingTransition={pendingTransition}
            commentBody={commentBody}
            transitionPending={transitionMutation.isPending}
            updateDuePending={updateDueMutation.isPending}
            onTransition={handleTransition}
            onOpenDueDateForm={openDueDateForm}
            onQuickDueDateChange={setQuickDueDate}
            onQuickDueReasonChange={setQuickDueReason}
            onQuickDueSubmit={handleQuickDueSubmit}
            onCancelDueDateForm={cancelDueDateForm}
            onCommentBodyChange={setCommentBody}
            onTransitionWithComment={handleTransitionWithComment}
            onCancelPendingTransition={() => {
              setPendingTransition(null);
              setCommentBody('');
            }}
          />

          <TaskCommentsSection
            comments={comments}
            newComment={newComment}
            onNewCommentChange={setNewComment}
            onSubmit={handleAddComment}
            isPending={commentMutation.isPending}
          />
        </div>

        <TaskDetailsSidebar
          task={task}
          isEditing={isEditing}
          canEdit={canEditTask}
          canEditDueDate={canEditDueDate}
          editAssigneeId={editAssigneeId}
          editDueDate={editDueDate}
          editDueReason={editDueReason}
          assigneeOptions={assigneeOptions}
          showAssigneeAccessHint={showAssigneeAccessHint}
          events={events}
          dueChanges={dueChanges}
          onEditAssigneeChange={setEditAssigneeId}
          onEditDueDateChange={setEditDueDate}
          onEditDueReasonChange={setEditDueReason}
        />
      </div>
    </div>
  );
}
