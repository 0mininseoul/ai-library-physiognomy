import * as React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ className = "", label, id, children, ...props }, ref) {
  const selectId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm font-bold text-ink" htmlFor={selectId}>
      <span>{label}</span>
      <select
        ref={ref}
        id={selectId}
        className={`min-h-12 rounded-lg border border-ink/10 bg-white px-4 text-base font-bold text-ink outline-none transition focus:border-library focus:ring-4 focus:ring-library/10 ${className}`.trim()}
        {...props}
      >
        {children}
      </select>
    </label>
  );
});
