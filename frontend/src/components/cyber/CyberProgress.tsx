type CyberProgressProps = {
    value: number;
    max?: number;
    label?: string;
    className?: string;
};

export default function CyberProgress({
    value,
    max = 100,
    label,
    className = "",
}: CyberProgressProps) {
    const safeMax = Math.max(1, max);
    const safeValue = Math.min(Math.max(value, 0), safeMax);
    const percent = Math.round((safeValue / safeMax) * 100);

    return (
        <div className={className}>
            {label ? (
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
                    <span>{label}</span>
                    <span>{percent}%</span>
                </div>
            ) : null}
            <div
                className="cyber-progress"
                role="progressbar"
                aria-valuenow={safeValue}
                aria-valuemin={0}
                aria-valuemax={safeMax}
            >
                <div
                    className="cyber-progress__bar"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
