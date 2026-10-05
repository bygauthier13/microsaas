import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <div>
      <h1 className="display text-3xl">Welcome back</h1>
      <p className="mt-1 mb-6 text-muted">Sign in to see today’s deadlines.</p>
      <LoginForm next={next} expired={sp.expired === "1"} />
      <p className="mt-6 text-sm text-muted">
        New to RepairClock?{" "}
        <Link href="/signup" className="font-medium text-ink underline underline-offset-2">Start a free trial</Link>{" "}
        or <Link href="/demo" className="font-medium text-ink underline underline-offset-2">explore the demo</Link>.
      </p>
    </div>
  );
}
