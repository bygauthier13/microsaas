import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { ChapteredVideo } from "@/components/video";
import { env } from "@/lib/env";
import { GUIDE_CHAPTERS, VIDEOS } from "@/lib/videos";

export const metadata = {
  title: "Setup guide — RepairClock in 8 steps (2-minute video)",
  description: VIDEOS.guide.description,
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: VIDEOS.guide.title,
    description: VIDEOS.guide.description,
    thumbnailUrl: [`${env.appUrl}${VIDEOS.guide.poster}`],
    contentUrl: `${env.appUrl}${VIDEOS.guide.src}`,
    uploadDate: "2026-10-06",
    duration: VIDEOS.guide.duration,
  };
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="eyebrow">Setup guide · 2 minutes</p>
      <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">{VIDEOS.guide.title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
        From creating your account to choosing a plan, with every click shown. Pick a step to jump straight to it.
      </p>

      <ChapteredVideo
        className="mt-8"
        src={VIDEOS.guide.src}
        poster={VIDEOS.guide.poster}
        title={VIDEOS.guide.title}
        label="Play the setup guide"
        chapters={GUIDE_CHAPTERS}
      />

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/signup?from=guide" className={buttonClass("signal", "lg")}>
          Start your free trial <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href="/demo" className={buttonClass("secondary", "lg")}>
          Try the sample agency first
        </Link>
      </div>
      <p className="mt-4 text-sm text-muted">
        14 days free · no card needed · questions?{" "}
        <a href={`mailto:${env.company.email}`} className="underline underline-offset-2">
          {env.company.email}
        </a>
      </p>
      <p className="mt-8 text-sm text-ink-2">
        New to RepairClock?{" "}
        <Link href="/#video" className="inline-flex items-center gap-1 font-medium text-ink underline underline-offset-2">
          <PlayCircle className="h-4 w-4 text-signal-strong" aria-hidden /> Watch the 90-second overview
        </Link>
      </p>
    </section>
  );
}
