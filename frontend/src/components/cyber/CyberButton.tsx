import type { ButtonHTMLAttributes, ReactNode } from "react";

type CyberButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: "solid" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    glow?: boolean;
    label?: string;
};

export default function CyberButton({
    children,
    className = "",
    type = "button",
    variant = "solid",
    size = "md",
    glow = true,
    label,
    ...props
}: CyberButtonProps) {
    const text = label ?? (typeof children === "string" ? children : "");

    return (
        <button
            className={`cyber-button ${className}`.trim()}
            data-glow={glow ? "true" : "false"}
            data-size={size}
            data-variant={variant}
            type={type}
            {...props}
        >
            <span className="cyber-button__label" data-text={text}>{children}</span>
        </button>
    );
}
