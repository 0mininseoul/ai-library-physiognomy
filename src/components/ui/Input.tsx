import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className = "", label, helper, id, ...props }, ref) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2.5 text-sm font-black text-text-primary" htmlFor={inputId}>
      <span>{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`min-h-12 rounded-xl border border-border bg-bg-card/70 px-4 text-base font-bold text-text-primary outline-none transition placeholder:text-text-faint focus:border-accent-info focus:ring-2 focus:ring-accent-info/25 ${className}`.trim()}
        {...props}
      />
      {helper ? <span className="text-xs font-bold leading-5 text-text-faint">{helper}</span> : null}
    </label>
  );
});
