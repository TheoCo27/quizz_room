import type { ButtonHTMLAttributes, ReactNode } from "react";
import CyberButton from "../cyber/CyberButton";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function SecondaryButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <CyberButton
      className={className}
      glow={false}
      type={type}
      variant="ghost"
      {...props}
    >
      {children}
    </CyberButton>
  );
}
