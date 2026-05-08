import * as React from "react";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: React.ReactNode;
  helper?: string;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className = "", label, helper, id, ...props }, ref) {
  const checkboxId = id ?? props.name;

  return (
    <label
      className={`flex items-start gap-3 rounded-lg border border-ink/10 bg-white p-4 text-sm font-semibold leading-6 text-ink transition has-[:checked]:border-library/50 has-[:checked]:bg-library/5 ${className}`.trim()}
      htmlFor={checkboxId}
    >
      <input
        ref={ref}
        id={checkboxId}
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 accent-library"
        {...props}
      />
      <span>
        {label}
        {helper ? <span className="mt-1 block text-xs font-medium leading-5 text-ink/60">{helper}</span> : null}
      </span>
    </label>
  );
});
