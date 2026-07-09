import { Link } from 'react-router-dom';
import type { ProjectStatus } from '../api/types';
import { MemberRemoveDialog } from '../components/MemberRemoveDialog';
import { ProjectActivityItem } from '../components/ProjectActivityItem';
import { ProjectMembersSection } from '../components/project/ProjectMembersSection';
import { ProjectStatsOverview } from '../components/ProjectStatsOverview';
import { ProjectTasksSection } from '../components/project/ProjectTasksSection';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Dropdown } from '../components/ui/Dropdown';
import { Input, Textarea, Field, FormActions } from '../components/ui/Form';
import { LoadingState } from '../components/ui/LoadingState';
import { PageError } from '../components/ui/PageError';
import { ProjectStatusBadge } from '../components/ui/ProjectStatusBadge';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { PROJECT_STATUS_OPTIONS } from '../lib/project-status';
import { useProjectPageModel } from './models/useProjectPageModel';

export function ProjectPage() {
  const model = useProjectPageModel();

  if (model.projectError) {
    return <PageError message="Failed to load project." />;
  }

  if (model.projectLoading && !model.project) {
    return <LoadingState label="Loading project…" />;
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={model.confirmDeleteProject}
        title="Delete project?"
        description="This will permanently delete the project and all its tasks. This action cannot be undone."
        confirmLabel="Delete project"
        loading={model.deleteProjectMutation.isPending}
        onConfirm={() => model.deleteProjectMutation.mutate()}
        onCancel={() => model.setConfirmDeleteProject(false)}
      />
      <MemberRemoveDialog
        member={model.members.memberToRemove}
        isPending={model.members.removeMemberMutation.isPending}
        onClose={() => model.members.setMemberToRemove(null)}
        onConfirm={() => {
          if (model.members.memberToRemove) {
            model.members.removeMemberMutation.mutate(model.members.memberToRemove.userId);
          }
        }}
      />
      {model.project?.status === 'PAUSED' ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This project is marked as paused (informational). Task workflow continues as usual.
        </p>
      ) : null}
      {model.project?.status === 'COMPLETED' ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          This project is marked as completed (informational). Task workflow continues as usual.
        </p>
      ) : null}
      <ErrorAlert message={model.combinedError} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            to={`/w/${model.workspaceId}/projects`}
            className="inline-flex text-sm font-medium text-brand-600 transition hover:text-brand-700"
          >
            ← All projects
          </Link>
          {model.isEditingProject && model.project ? (
            <div className="mt-4 max-w-2xl space-y-4 rounded-xl border border-slate-200/70 bg-slate-50/50 p-4">
              <Field label="Name" htmlFor="project-name-edit">
                <Input
                  id="project-name-edit"
                  value={model.editProjectName}
                  onChange={(e) => model.setEditProjectName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Description" htmlFor="project-desc-edit">
                <Textarea
                  id="project-desc-edit"
                  value={model.editProjectDescription}
                  onChange={(e) => model.setEditProjectDescription(e.target.value)}
                />
              </Field>
              <Field label="Project status">
                <Dropdown
                  value={model.editProjectStatus}
                  onChange={(value) => model.setEditProjectStatus(value as ProjectStatus)}
                  options={PROJECT_STATUS_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  compactTrigger
                  fullWidth
                />
              </Field>
              <FormActions>
                <Button
                  type="button"
                  onClick={model.handleSaveProject}
                  disabled={model.updateProjectMutation.isPending}
                >
                  {model.updateProjectMutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={model.cancelEditingProject}
                  disabled={model.updateProjectMutation.isPending}
                >
                  Cancel
                </Button>
              </FormActions>
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  {model.project?.name ?? '…'}
                </h1>
                {model.project ? <ProjectStatusBadge status={model.project.status} /> : null}
              </div>
              {model.project?.description ? (
                <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-slate-500">
                  {model.project.description}
                </p>
              ) : (
                <p className="mt-2 text-sm italic text-slate-400">No description</p>
              )}
            </>
          )}
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          {model.canManage && model.projectEditable && !model.isEditingProject ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={model.startEditingProject}
                className="w-full sm:w-auto"
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-rose-600 hover:text-rose-700 sm:w-auto"
                disabled={model.deleteProjectMutation.isPending}
                onClick={() => model.setConfirmDeleteProject(true)}
              >
                Delete project
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className={`grid gap-6 ${model.canManage ? 'lg:grid-cols-3' : ''}`}>
        <div className={`space-y-6 ${model.canManage ? 'lg:col-span-2' : ''}`}>
          {model.stats ? <ProjectStatsOverview stats={model.stats} /> : null}

          <ProjectTasksSection
            workspaceId={model.workspaceId}
            projectId={model.projectId}
            tasks={model.tasks}
            tasksLoading={model.tasksLoading}
            tasksError={model.tasksError}
            canCreateTask={model.canCreateTask}
            showCreateTask={model.showCreateTask}
            taskTitle={model.taskTitle}
            taskDescription={model.taskDescription}
            taskDueDate={model.taskDueDate}
            assigneeId={model.assigneeId}
            assigneeOptions={model.assigneeOptions}
            showAssigneeAccessHint={model.showAssigneeAccessHint}
            createPending={model.createTaskMutation.isPending}
            onToggleCreateTask={() => model.setShowCreateTask((v) => !v)}
            onTaskTitleChange={model.setTaskTitle}
            onTaskDescriptionChange={model.setTaskDescription}
            onTaskDueDateChange={model.setTaskDueDate}
            onAssigneeIdChange={model.setAssigneeId}
            onCreateTask={model.handleCreateTask}
          />

          <Card title="Activity feed" accent="amber">
            {model.activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              <>
                <ul>
                  {model.activity.map((item) => (
                    <ProjectActivityItem
                      key={`${item.type}-${item.id}`}
                      item={item}
                      workspaceId={model.workspaceId}
                      projectId={model.projectId}
                    />
                  ))}
                </ul>
                {model.hasMoreActivity ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        model.setActivityLimit(
                          (limit) => limit + model.activityPageSize,
                        )
                      }
                    >
                      Load more
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>

        {model.canManage ? (
          <ProjectMembersSection
            readOnly={!model.projectEditable}
            projectMembers={model.members.projectMembers}
            roleByUserId={model.members.roleByUserId}
            availableForProject={model.members.availableForProject}
            memberUserId={model.members.memberUserId}
            addPending={model.members.addMemberMutation.isPending}
            removePending={model.members.removeMemberMutation.isPending}
            onMemberUserIdChange={model.members.setMemberUserId}
            onAddMember={() =>
              model.members.addMemberMutation.mutate(model.members.memberUserId)
            }
            onRemoveMember={model.members.setMemberToRemove}
            memberDropdownOptions={model.memberDropdownOptions}
          />
        ) : null}
      </div>
    </div>
  );
}
