import { WORKFLOW_STEPS } from '../lib/task-status';

type TaskWorkflowStepsProps = {
  variant?: 'dark' | 'light';
};

const variantStyles = {
  dark: {
    connector: 'from-white/30 to-white/10',
    pill: 'bg-white/10 text-white ring-white/20',
    number: 'bg-white/20 text-white',
  },
  light: {
    connector: 'from-brand-200 to-brand-100',
    pill: 'bg-brand-50 text-brand-900 ring-brand-200/80',
    number: 'bg-brand-100 text-brand-700',
  },
} as const;

export function TaskWorkflowSteps({ variant = 'dark' }: TaskWorkflowStepsProps) {
  const styles = variantStyles[variant];

  return (
    <ol className="flex flex-col gap-2" aria-label="Task workflow">
      {WORKFLOW_STEPS.map((step, index) => (
        <li key={step.status} className="flex flex-col items-start">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 backdrop-blur-sm ${styles.pill}`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${styles.number}`}
            >
              {index + 1}
            </span>
            <span className="text-xs font-semibold">{step.label}</span>
          </span>
          {index < WORKFLOW_STEPS.length - 1 ? (
            <span
              className={`ml-5 h-3 w-px bg-gradient-to-b ${styles.connector}`}
              aria-hidden
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
