import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/forms";

export const metadata: Metadata = {
  title: "Start your free trial",
  description: "Set up RepairClock in two minutes. 14-day free trial, no card required.",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const source = typeof sp.from === "string" ? sp.from.slice(0, 40) : undefined;
  return (
    <div>
      <h1 className="display text-3xl">Put every report on the clock</h1>
      <p className="mt-1 mb-6 text-muted">Two minutes to set up. 14 days free.</p>
      <SignupForm source={source} />
      <p className="mt-6 text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-ink underline underline-offset-2">Sign in</Link>
      </p>
    </div>
  );
}
