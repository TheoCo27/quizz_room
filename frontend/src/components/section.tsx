import { HTMLAttributes } from "react";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  className?: string;
}

export default function Section({
  className = "",
  ...props
}: SectionProps) {
  return (
    <section
      className={[
        "cyber-panel rounded-4xl p-6",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
