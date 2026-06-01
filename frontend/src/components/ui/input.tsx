import { forwardRef } from "react";

type InputProps = {
  className?: string;
  type?: string;
} & React.ComponentPropsWithRef<"input">;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`cyber-input ${className}`.trim()}
        type={type}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export default Input;
