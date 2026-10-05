import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "signal";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap select-none";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2 shadow-[0_1px_0_rgba(0,0,0,.08)]",
  signal: "bg-signal text-white hover:bg-signal-strong shadow-[0_1px_0_rgba(0,0,0,.08)]",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-paper",
  ghost: "text-ink hover:bg-paper-2",
  danger: "bg-surface text-bad border border-bad/30 hover:bg-bad-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[0.95rem]",
  lg: "h-12 px-5 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const fieldBase =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-ink placeholder:text-faint focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:bg-paper";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(fieldBase, "py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={clsx(fieldBase, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={clsx("block text-sm font-medium text-ink", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted leading-relaxed">{hint}</p> : null}
      {error ? <p className="text-xs text-bad">{error}</p> : null}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("card", className)} {...props} />;
}

type Tone = "neutral" | "ok" | "warn" | "bad" | "info" | "signal";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-2 text-muted border-line",
  ok: "bg-ok-soft text-ok border-ok/20",
  warn: "bg-warn-soft text-warn border-warn/20",
  bad: "bg-bad-soft text-bad border-bad/20",
  info: "bg-info-soft text-info border-info/20",
  signal: "bg-signal-soft text-signal-strong border-signal/20",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const border: Record<Tone, string> = {
    neutral: "border-line bg-surface",
    ok: "border-ok/25 bg-ok-soft",
    warn: "border-warn/25 bg-warn-soft",
    bad: "border-bad/25 bg-bad-soft",
    info: "border-info/25 bg-info-soft",
    signal: "border-signal/25 bg-signal-soft",
  };
  return (
    <div className={clsx("rounded-xl border px-4 py-3 text-sm leading-relaxed", border[tone], className)} role="status">
      {title ? <p className="font-semibold mb-0.5">{title}</p> : null}
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="display text-3xl sm:text-[2.1rem] leading-tight">{title}</h1>
        {description ? <p className="mt-1.5 text-muted max-w-2xl leading-relaxed">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card px-6 py-12 text-center">
      {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-ink">{icon}</div> : null}
      <h3 className="display text-xl">{title}</h3>
      <div className="mx-auto mt-2 max-w-md text-sm text-muted leading-relaxed">{body}</div>
      {action ? <div className="mt-6 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: Tone; hint?: ReactNode }) {
  const color: Partial<Record<Tone, string>> = { bad: "text-bad", warn: "text-warn", ok: "text-ok", signal: "text-signal" };
  return (
    <div className="card px-4 py-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
      <p className={clsx("mt-1 text-3xl font-semibold tabular", tone ? color[tone] : "text-ink")}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
