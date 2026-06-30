import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { controlBorderClass, controlSizeClass } from './Form';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const layoutClass = `inline-flex shrink-0 items-center justify-center px-4 font-semibold ${controlSizeClass}`;

const variants: Record<Variant, string> = {
  primary:
    'border border-transparent bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/20 hover:-translate-y-px hover:from-brand-700 hover:to-brand-600 hover:shadow-lg hover:shadow-brand-600/35 hover:brightness-105 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md',
  secondary: `${controlBorderClass} text-slate-700 hover:-translate-y-px hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 hover:shadow-md hover:shadow-brand-600/10 disabled:hover:translate-y-0`,
  danger:
    'border border-transparent bg-gradient-to-r from-rose-600 to-accent-500 text-white shadow-md shadow-rose-500/20 hover:-translate-y-px hover:from-rose-700 hover:to-rose-600 hover:shadow-lg hover:shadow-rose-500/35 disabled:opacity-50 disabled:hover:translate-y-0',
  ghost:
    'border border-transparent bg-transparent text-slate-600 shadow-none hover:-translate-y-px hover:bg-slate-100 hover:text-brand-700 hover:shadow-sm disabled:hover:translate-y-0',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

type ButtonLinkProps = LinkProps & {
  variant?: Variant;
  children: ReactNode;
};

function mergeClass(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
}

function buttonClass(variant: Variant, className?: string) {
  return mergeClass(
    `${layoutClass} transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${variants[variant]}`,
    className,
  );
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonClass(variant, className)} cursor-pointer disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
    </Link>
  );
}
