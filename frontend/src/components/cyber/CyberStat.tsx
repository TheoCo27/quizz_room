import type { ReactNode } from "react";

type CyberStatProps = {
    label: string;
    value: ReactNode;
    hint?: string;
    className?: string;
};

export default function CyberStat({
    label,
    value,
    hint,
    className = "",
}: CyberStatProps) {
    return (
        <div className={`cyber-stat ${className}`.trim()}>
            <div className="cyber-stat__label">{label}</div>
            <div className="cyber-stat__value">{value}</div>
            {hint ? <div className="cyber-stat__hint">{hint}</div> : null}
        </div>
    );
}
