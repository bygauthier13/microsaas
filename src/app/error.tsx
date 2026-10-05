"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="display text-3xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-ink-2">
        Nothing you saved has been lost — every action is recorded as it happens. Try again, and if it keeps happening email{" "}
        <a href="mailto:support@repairclock.co.uk" className="underline">support@repairclock.co.uk</a>
        {error.digest ? ` quoting reference ${error.digest}` : ""}.
      </p>
      <button type="button" onClick={reset} className={buttonClass("primary", "md", "mt-6")}>
        Try again
      </button>
    </div>
  );
}
