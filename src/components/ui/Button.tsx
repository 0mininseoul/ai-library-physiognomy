import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45";

const variantClass: Record<ButtonVariant, string> = {
  primary: "border border-accent-info/40 bg-accent-info/[0.18] text-text-primary shadow-glass hover:bg-accent-info/[0.25] focus-visible:outline-accent-info",
  secondary: "border border-border bg-bg-card/70 text-text-primary hover:border-border-bright hover:bg-bg-card-hover focus-visible:outline-accent-info",
  ghost: "bg-transparent text-text-muted hover:bg-white/[0.08] hover:text-text-primary focus-visible:outline-accent-info",
  danger: "border border-accent-info/35 bg-black/30 text-text-primary hover:border-border-bright hover:bg-bg-card-hover focus-visible:outline-accent-info",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", variant = "primary", type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={`${baseClass} ${variantClass[variant]} ${className}`.trim()} {...props} />;
});
