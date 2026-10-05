"use client";

import { createContext, useContext, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonClass } from "./ui";

/** Forms submitted through useFormAction provide their pending state here. */
export const FormPendingContext = createContext<boolean | null>(null);

type Props = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "signal";
  size?: "sm" | "md" | "lg";
  pendingLabel?: string;
};

export function SubmitButton({ variant = "primary", size = "md", className, children, pendingLabel, ...props }: Props) {
  const status = useFormStatus();
  const ctx = useContext(FormPendingContext);
  const pending = ctx ?? status.pending;
  return (
    <button type="submit" disabled={pending || props.disabled} aria-busy={pending || undefined} className={buttonClass(variant, size, className)} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
