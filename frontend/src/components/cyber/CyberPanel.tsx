import type { ReactNode } from "react";

type CyberPanelProps = {
    children: ReactNode;
    className?: string;
};

export default function CyberPanel({ children, className = "" }: CyberPanelProps) {
    return <div className={`cyber-panel ${className}`.trim()}>{children}</div>;
}
