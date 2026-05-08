import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className = "", label, helper, id, ...props }, ref) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm font-bold text-ink" htmlFor={inputId}>
      <span>{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`min-h-12 rounded-lg border border-ink/10 bg-white px-4 text-base font-medium text-ink outline-none transition placeholder:text-ink/40 focus:border-library focus:ring-4 focus:ring-library/10 ${className}`.trim()}
        {...props}
      />
      {helper ? <span className="text-xs font-medium leading-5 text-ink/60">{helper}</span> : null}
    </label>
  );
});
