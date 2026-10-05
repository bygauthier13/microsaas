import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="display text-3xl">Reset your password</h1>
      <p className="mt-1 mb-6 text-muted">We’ll email you a link that works for 60 minutes.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-muted">
        Remembered it? <Link href="/login" className="font-medium text-ink underline underline-offset-2">Sign in</Link>
      </p>
    </div>
  );
}
