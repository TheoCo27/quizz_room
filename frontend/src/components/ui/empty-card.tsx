interface EmptyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function EmptyCard({
  children,
  className,
  ...props
}: EmptyCardProps) {
  return (
    <div
      className={`cyber-card mt-5 rounded-3xl border-dashed border-white/20 bg-white/5 px-5 py-5 text-sm leading-7 text-text-muted ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}
