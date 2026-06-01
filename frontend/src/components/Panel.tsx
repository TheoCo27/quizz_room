import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export default function Panel({ children, className = "" }: PanelProps) {
  return (
    <div className={`cyber-panel flex flex-col rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
