import * as React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ className = "", label, id, children, ...props }, ref) {
  const selectId = id ?? props.name;

  return (
    <label className="grid gap-2.5 text-sm font-black text-text-primary" htmlFor={selectId}>
      <span>{label}</span>
      <select
        ref={ref}
        id={selectId}
        className={`min-h-12 rounded-xl border border-border bg-bg-card/70 px-4 text-base font-black text-text-primary outline-none transition focus:border-accent-info focus:ring-2 focus:ring-accent-info/25 ${className}`.trim()}
        {...props}
      >
        {children}
      </select>
    </label>
  );
});
