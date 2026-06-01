import { forwardRef } from "react";

type CyberInputProps = {
    className?: string;
    type?: string;
} & React.ComponentPropsWithRef<"input">;

const CyberInput = forwardRef<HTMLInputElement, CyberInputProps>(
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

CyberInput.displayName = "CyberInput";

export default CyberInput;
