import type { ReactNode } from "react";

type CyberBadgeProps = {
    children: ReactNode;
    className?: string;
    variant?: "neutral" | "success" | "warning" | "danger" | "info";
};

export default function CyberBadge({
    children,
    className = "",
    variant = "neutral",
}: CyberBadgeProps) {
    return (
        <span className={`cyber-badge ${className}`.trim()} data-variant={variant}>
            {children}
        </span>
    );
}
