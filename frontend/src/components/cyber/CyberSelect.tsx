import { ChevronDown } from "lucide-react";

type CyberSelectProps = {
    className?: string;
} & React.ComponentPropsWithoutRef<"select">;

export default function CyberSelect({
    className = "",
    ...props
}: CyberSelectProps) {
    return (
        <div className="cyber-select">
            <select
                className={`cyber-input cyber-select__input ${className}`.trim()}
                {...props}
            />
            <ChevronDown
                aria-hidden="true"
                strokeWidth={2}
                className="cyber-select__icon"
            />
        </div>
    );
}
