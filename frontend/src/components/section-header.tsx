import { HTMLAttributes } from "react";

interface SectionHeaderProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

export default function SectionHeader({
  className = "",
  children,
  ...props
}: SectionHeaderProps) {
  return (
    <h2
      className={`cyber-title mt-3 text-2xl text-text ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
}
