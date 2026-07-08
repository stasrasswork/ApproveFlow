import type { FormEvent, ReactNode } from 'react';
import { Button } from './Button';
import { DatePickerInput } from './DatePickerInput';
import { FormActions, FormStack, Input, Label } from './Form';
import { addDaysToDateInput } from '../../lib/calendar';
import {
  dateInputToIso,
  daysUntilDue,
  formatDate,
  formatDaysUntil,
} from '../../lib/format';

const QUICK_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
] as const;

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      />
    </svg>
  );
}

export function DueDateDisplay({
  dueAt,
  className = '',
}: {
  dueAt: string | null;
  className?: string;
}) {
  const diff = daysUntilDue(dueAt);
  const overdue = diff !== null && diff < 0;
  const relative = formatDaysUntil(dueAt);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        dueAt
          ? overdue
            ? 'border-rose-200/80 bg-gradient-to-br from-rose-50/90 to-white'
            : 'border-brand-200/70 bg-gradient-to-br from-brand-50/80 to-white'
          : 'border-dashed border-slate-200 bg-slate-50/70'
      } ${className}`}
    >
      <div
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${
          dueAt
            ? overdue
              ? 'bg-rose-100 text-rose-600 ring-1 ring-rose-200/80'
              : 'bg-brand-100 text-brand-600 ring-1 ring-brand-200/80'
            : 'bg-white text-slate-400 ring-1 ring-slate-200/80'
        }`}
      >
        <CalendarIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p
          className={`text-sm font-semibold ${
            dueAt ? (overdue ? 'text-rose-900' : 'text-slate-900') : 'text-slate-500'
          }`}
        >
          {formatDate(dueAt)}
        </p>
        {relative ? (
          <p
            className={`mt-0.5 text-xs font-medium ${
              overdue ? 'text-rose-700' : 'text-brand-700'
            }`}
          >
            {relative}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-400">No deadline set</p>
        )}
      </div>
    </div>
  );
}

export function DueDatePickerFields({
  dueDate,
  onDueDateChange,
  reason,
  onReasonChange,
  reasonId = 'due-reason',
  dateId = 'due-date',
}: {
  dueDate: string;
  onDueDateChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  reasonId?: string;
  dateId?: string;
}) {
  const preview = dueDate ? formatDate(dateInputToIso(dueDate)) : null;
  const relative = dueDate ? formatDaysUntil(dateInputToIso(dueDate)) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50/40 via-white to-violet-50/30 shadow-sm shadow-brand-600/5">
      <div className="border-b border-brand-100/80 bg-white/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Choose deadline</p>
            <p className="text-xs text-slate-500">Use the calendar or a quick option below</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {preview ? (
          <div className="rounded-xl border border-brand-100 bg-white/80 px-4 py-3 text-center">
            <p className="text-lg font-semibold tracking-tight text-slate-900">
              {preview}
            </p>
            {relative ? (
              <p className="mt-0.5 text-xs font-medium text-brand-700">{relative}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((preset) => {
            const presetDate = addDaysToDateInput(preset.days);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onDueDateChange(presetDate)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  dueDate === presetDate
                    ? 'border-brand-400 bg-brand-100 text-brand-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={dateId}>Date</Label>
          <DatePickerInput
            key={`${dateId}-${dueDate}`}
            id={dateId}
            value={dueDate}
            onChange={onDueDateChange}
            placeholder="Select date"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>Reason (optional)</Label>
          <Input
            id={reasonId}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Why this deadline?"
          />
        </div>
      </div>
    </div>
  );
}

export function DueDatePickerPanel({
  dueDate,
  onDueDateChange,
  reason,
  onReasonChange,
  onSubmit,
  onCancel,
  isPending = false,
  submitLabel = 'Save due date',
  children,
}: {
  dueDate: string;
  onDueDateChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
  children?: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-slate-100 pt-4">
      <FormStack>
        <DueDatePickerFields
          dueDate={dueDate}
          onDueDateChange={onDueDateChange}
          reason={reason}
          onReasonChange={onReasonChange}
          dateId="quick-due"
          reasonId="quick-due-reason"
        />
        {children}
        <FormActions>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : submitLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        </FormActions>
      </FormStack>
    </form>
  );
}
