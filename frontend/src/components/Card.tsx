import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "cyber-card flex w-full max-w-2xl flex-col rounded-4xl",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
