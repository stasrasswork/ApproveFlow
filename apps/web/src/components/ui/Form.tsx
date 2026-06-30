import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

/** Shared dimensions for inputs, buttons, and badges in one row */
export const controlSizeClass =
  'h-11 rounded-xl text-sm shadow-sm outline-none transition';

export const controlBorderClass = 'border border-slate-200 bg-white';

export const fieldClass = `w-full px-4 ${controlSizeClass} ${controlBorderClass} text-slate-800 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100/80 disabled:cursor-not-allowed disabled:opacity-50`;

export const titleFieldClass = `w-full min-w-0 px-4 ${controlSizeClass} ${controlBorderClass} font-display text-lg font-bold tracking-tight text-slate-900 placeholder:text-slate-400 hover:border-slate-300 hover:shadow-md focus:border-brand-400 focus:ring-2 focus:ring-brand-100/80 disabled:cursor-not-allowed disabled:opacity-50`;

export const textareaClass =
  'min-h-[6.5rem] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100/80 disabled:cursor-not-allowed disabled:opacity-50';

function mergeClass(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={mergeClass(fieldClass, className)} {...props} />;
}

export function TitleInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={mergeClass(titleFieldClass, className)} {...props} />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={mergeClass(textareaClass, className)}
      rows={4}
      {...props}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  className = '',
}: {
  label?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
    </div>
  );
}

export function FormStack({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
}

export function InlineFormRow({
  children,
  className = '',
  align = 'center',
}: {
  children: ReactNode;
  className?: string;
  align?: 'center' | 'end';
}) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${align === 'end' ? 'items-end' : 'items-center'} ${className}`}
    >
      {children}
    </div>
  );
}

export function FormActions({
  children,
  className = '',
  align = 'start',
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 pt-0.5 ${align === 'end' ? 'justify-end' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
