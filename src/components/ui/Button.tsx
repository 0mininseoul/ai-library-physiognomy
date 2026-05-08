import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-library text-white shadow-sm shadow-library/20 hover:bg-library/90 focus-visible:outline-library",
  secondary: "border border-ink/10 bg-white text-ink hover:border-library/40 hover:bg-library/5 focus-visible:outline-library",
  ghost: "bg-transparent text-ink hover:bg-ink/5 focus-visible:outline-library",
  danger: "bg-prescription text-white shadow-sm shadow-prescription/20 hover:bg-prescription/90 focus-visible:outline-prescription",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", variant = "primary", type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={`${baseClass} ${variantClass[variant]} ${className}`.trim()} {...props} />;
});
