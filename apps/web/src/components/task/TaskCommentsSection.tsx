import type { FormEvent } from 'react';
import type { Comment } from '../../api/types';
import { formatDateTime } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AuthorLine } from '../ui/RoleBadge';
import { Textarea, Field, FormStack, FormActions } from '../ui/Form';

type TaskCommentsSectionProps = {
  comments: Comment[];
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  isPending: boolean;
};

export function TaskCommentsSection({
  comments,
  newComment,
  onNewCommentChange,
  onSubmit,
  isPending,
}: TaskCommentsSectionProps) {
  return (
    <Card title="Comments" accent="amber">
      <ul className="mb-4 space-y-3">
        {comments.length === 0 ? (
          <li className="text-sm text-slate-500">No comments yet.</li>
        ) : (
          comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-3"
            >
              <div>
                <AuthorLine
                  author={comment.author}
                  role={comment.authorRole}
                  timestamp={formatDateTime(comment.createdAt)}
                />
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
                  {comment.body}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={onSubmit}>
        <FormStack>
          <Field label="Add comment">
            <Textarea
              value={newComment}
              onChange={(e) => onNewCommentChange(e.target.value)}
              placeholder="Write a comment…"
            />
          </Field>
          <FormActions>
            <Button type="submit" variant="secondary" disabled={isPending}>
              Post comment
            </Button>
          </FormActions>
        </FormStack>
      </form>
    </Card>
  );
}
