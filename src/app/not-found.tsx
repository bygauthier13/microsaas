import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <Logo />
      <p className="mt-10 font-mono text-sm text-muted">404</p>
      <h1 className="display mt-2 text-4xl">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-md text-ink-2">The link may be out of date, or the case may belong to a different workspace.</p>
      <div className="mt-8 flex gap-2">
        <Link href="/app" className={buttonClass("primary")}>
          Go to your dashboard
        </Link>
        <Link href="/" className={buttonClass("secondary")}>
          Home
        </Link>
      </div>
    </div>
  );
}
