import { ChevronDown } from "lucide-react";

type SelectProps = {
  className?: string;
  min: number;
  max: number;
} & React.ComponentPropsWithoutRef<"select">;

const Select = ({ className, min, max, ...props }: SelectProps) => {
  const options = [];
  for (let i = min; i <= max; i++) {
    options.push(
      <option key={i} value={i}>
        {i}
      </option>,
    );
  }
  return (
    <div className="cyber-select">
      <select
        className={`cyber-input cyber-select__input ${className ?? ""}`.trim()}
        {...props}
      >
        {options}
      </select>

      <ChevronDown
        aria-hidden="true"
        strokeWidth={2}
        className="cyber-select__icon"
      />
    </div>
  );
};

export default Select;
