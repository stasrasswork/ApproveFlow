import type { ProjectStats } from '../api/types';

type StatAccent = 'blue' | 'rose' | 'amber' | 'orange';

const STAT_VALUE_STYLES: Record<StatAccent, string> = {
  blue: 'bg-brand-50 text-brand-600',
  rose: 'bg-rose-50 text-rose-500',
  amber: 'bg-amber-50 text-amber-600',
  orange: 'bg-orange-50 text-orange-600',
};

function StatsGroup({
  title,
  hint,
  accentBar,
  items,
}: {
  title: string;
  hint: string;
  accentBar: 'blue' | 'amber';
  items: { label: string; value: number; accent: StatAccent }[];
}) {
  const barColors = {
    blue: 'bg-brand-400',
    amber: 'bg-amber-400',
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3 border-b border-slate-100 pb-4">
        <span
          className={`mt-0.5 h-8 w-1 shrink-0 rounded-full ${barColors[accentBar]}`}
          aria-hidden
        />
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center px-3 py-2 text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {item.label}
            </p>
            <span
              className={`mt-2 flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-semibold tabular-nums leading-none tracking-tight sm:h-16 sm:w-16 sm:text-[1.75rem] ${STAT_VALUE_STYLES[item.accent]}`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProjectStatsOverview({ stats }: { stats: ProjectStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StatsGroup
        title="In progress"
        hint="Active work on this project"
        accentBar="blue"
        items={[
          { label: 'Not done', value: stats.notDone, accent: 'blue' },
          { label: 'Overdue', value: stats.overdueDue, accent: 'rose' },
        ]}
      />
      <StatsGroup
        title="Client review"
        hint="Tasks waiting on the client"
        accentBar="amber"
        items={[
          { label: 'Awaiting client', value: stats.clientHandoff, accent: 'amber' },
          { label: 'In approval', value: stats.clientApproval, accent: 'orange' },
        ]}
      />
    </div>
  );
}
