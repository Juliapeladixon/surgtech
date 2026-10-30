import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconArrowLeft } from "./Icons";

type Step = { label: string; to?: string; current?: boolean };

export function StepTrail({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
      {steps.map((step, index) => (
        <li key={`${step.label}-${index}`} className="flex items-center gap-2">
          {index > 0 && <span aria-hidden className="text-line">/</span>}
          {step.to && !step.current ? (
            <Link to={step.to} className="hover:text-ink">
              {step.label}
            </Link>
          ) : (
            <span className={step.current ? "font-medium text-ink" : undefined}>
              {step.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function BackLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`no-print inline-flex items-center gap-1.5 text-[13px] text-sky hover:text-ink ${className}`}
    >
      <IconArrowLeft className="h-3.5 w-3.5 shrink-0" />
      {children}
    </Link>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  action,
  icon,
  lead,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="overflow-hidden border border-line">
      <div className="h-1.5 bg-teal" />
      <div className="bg-scrub text-white">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-6">
          <div className="flex items-start gap-3.5">
            {lead}
            {!lead && icon && (
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center bg-teal text-white">
                {icon}
              </span>
            )}
            <div>
              {kicker && (
                <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-sky">
                  {kicker}
                </p>
              )}
              <h1 className="font-serif text-[1.85rem] font-medium leading-tight tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 border border-dashed border-line bg-paper px-5 py-10 text-sm text-muted">
      {children}
    </div>
  );
}
