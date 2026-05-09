import * as React from "react";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: React.ReactNode;
  helper?: string;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className = "", label, helper, id, ...props }, ref) {
  const checkboxId = id ?? props.name;

  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-border bg-bg-card/70 p-4 text-sm font-bold leading-6 text-text-muted transition hover:border-border-bright has-[:checked]:border-accent-info/50 has-[:checked]:bg-accent-info/[0.08] ${className}`.trim()}
      htmlFor={checkboxId}
    >
      <input
        ref={ref}
        id={checkboxId}
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent-info)]"
        {...props}
      />
      <span>
        {label}
        {helper ? <span className="mt-1 block text-xs font-bold leading-5 text-text-faint">{helper}</span> : null}
      </span>
    </label>
  );
});
