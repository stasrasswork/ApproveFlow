import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type AuthFormLayoutProps = {
  title: string;
  subtitle?: string;
  backLink?: { to: string; label: string };
  footer?: ReactNode;
  headerExtra?: ReactNode;
  headingAs?: 'h1' | 'h2';
  children: ReactNode;
};

export function AuthFormLayout({
  title,
  subtitle,
  backLink,
  footer,
  headerExtra,
  headingAs: Heading = 'h1',
  children,
}: AuthFormLayoutProps) {
  return (
    <>
      <div className={backLink ? 'mb-6' : 'mb-8'}>
        {backLink ? (
          <Link
            to={backLink.to}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {backLink.label}
          </Link>
        ) : null}
        <Heading
          className={
            backLink
              ? 'mt-4 text-2xl font-semibold tracking-tight'
              : 'text-2xl font-semibold tracking-tight text-slate-900'
          }
        >
          {title}
        </Heading>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
        {headerExtra}
      </div>
      {children}
      {footer ? (
        <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
      ) : null}
    </>
  );
}
