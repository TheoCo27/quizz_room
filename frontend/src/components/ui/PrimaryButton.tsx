import type { ButtonHTMLAttributes, ReactNode } from "react";
import CyberButton from "../cyber/CyberButton";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function PrimaryButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <CyberButton className={className} type={type} {...props}>
      {children}
    </CyberButton>
  );
}
