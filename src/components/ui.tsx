import { cn } from "@/lib/utils";
import * as React from "react";

// ===== Card =====
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface",
        className
      )}
      {...props}
    />
  );
}

// ===== Badge =====
type BadgeTone = "neutral" | "accent" | "info" | "warn" | "danger" | "success" | "purple";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-muted border-border-strong",
  accent: "bg-accent-soft text-accent border-accent/30",
  info: "bg-info/10 text-info border-info/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  success: "bg-success/10 text-success border-success/30",
  purple: "bg-[#a855f7]/10 text-[#c084fc] border-[#a855f7]/30",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: BadgeTone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}

// ===== Button =====
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover font-semibold shadow-[0_0_0_1px_rgba(22,224,139,0.2)]",
  secondary: "bg-surface-3 text-foreground hover:bg-border-strong",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
  outline: "border border-border-strong text-foreground hover:bg-surface-2",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: { variant?: ButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none",
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}

// ===== Page header =====
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 min-[720px]:px-8 min-[720px]:py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight min-[720px]:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-muted min-[720px]:text-sm">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
