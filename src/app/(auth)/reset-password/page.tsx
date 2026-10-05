import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div>
      <h1 className="display text-3xl">Choose a new password</h1>
      <p className="mt-1 mb-6 text-muted">You’ll be signed in straight away.</p>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert tone="bad">
          This link is missing its token. <Link href="/forgot-password" className="underline">Request a new link</Link>.
        </Alert>
      )}
    </div>
  );
}
