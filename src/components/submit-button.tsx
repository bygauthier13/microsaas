"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { buttonClass } from "./ui";

type Props = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "signal";
  size?: "sm" | "md" | "lg";
  pendingLabel?: string;
};

export function SubmitButton({ variant = "primary", size = "md", className, children, pendingLabel, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || props.disabled} className={buttonClass(variant, size, className)} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
