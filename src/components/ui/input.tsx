import * as React from "react";

import { cn } from "@/lib/utils";
import { DateField } from "@/components/ui/date-field";

const DateInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, value, defaultValue, onChange, onBlur, min, max, disabled, readOnly, id, name, placeholder }, ref) => {
    const controlled = value != null;
    const [inner, setInner] = React.useState(value == null ? String(defaultValue ?? "") : String(value));

    React.useEffect(() => {
      if (value != null) setInner(String(value));
    }, [value]);

    const setNode = (node: HTMLInputElement | null) => {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
      if (node && !controlled && node.value) setInner(node.value.slice(0, 10));
    };

    return (
      <>
        <input ref={setNode} type="hidden" name={name} value={inner} readOnly />
        <DateField
          id={id}
          name={name}
          value={inner}
          min={min == null ? undefined : String(min)}
          max={max == null ? undefined : String(max)}
          disabled={disabled || readOnly}
          placeholder={placeholder}
          className={className}
          onChange={(event) => {
            setInner(event.target.value);
            onChange?.(event);
          }}
          onBlur={() => onBlur?.({ target: { name, value: inner } } as React.FocusEvent<HTMLInputElement>)}
        />
      </>
    );
  },
);
DateInput.displayName = "DateInput";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    if (type === "date") {
      return <DateInput ref={ref} className={className} {...props} />;
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[6px] border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-[10px]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
