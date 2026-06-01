import type { ReactNode } from "react";

type CyberCardProps = {
    children: ReactNode;
    className?: string;
    accent?: "cyan" | "magenta" | "lime";
};

export default function CyberCard({
    children,
    className = "",
    accent = "cyan",
}: CyberCardProps) {
    return (
        <div className={`cyber-card ${className}`.trim()} data-accent={accent}>
            {children}
        </div>
    );
}
