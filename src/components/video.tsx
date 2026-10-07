"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Play, X } from "lucide-react";
import { sendEvent } from "@/components/marketing/beacon";
import { VIDEOS } from "@/lib/videos";

/** Records that someone started a video, and where (anonymous, once per player). */
function countPlay(src: string, counted: { current: boolean }) {
  if (counted.current) return;
  counted.current = true;
  const path = window.location.pathname;
  const page = path === "/" ? "home" : path.startsWith("/guide") ? "guide" : path.startsWith("/app") ? "app" : "other";
  sendEvent("video_played", { video: src.split("/").pop()?.replace(/\.mp4$/, "") ?? src, page });
}

/** The round play button drawn over a video's poster. */
export function PlayBadge({ size = "lg" }: { size?: "md" | "lg" }) {
  return (
    <span
      className={clsx(
        "flex items-center justify-center rounded-full bg-signal text-white shadow-[var(--shadow-lift)] transition-transform group-hover:scale-105",
        size === "lg" ? "h-20 w-20" : "h-14 w-14",
      )}
    >
      <Play className={clsx("translate-x-0.5", size === "lg" ? "h-8 w-8" : "h-6 w-6")} fill="currentColor" aria-hidden />
    </span>
  );
}

const frame = "relative overflow-hidden rounded-2xl border border-line bg-ink shadow-[var(--shadow-lift)]";

/** A video that only loads once someone presses play; `label` names the play button. */
export function Video({ src, poster, title, label, className }: { src: string; poster: string; title: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const counted = useRef(false);
  const [started, setStarted] = useState(false);
  return (
    <div className={clsx(frame, className)}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        controls={started}
        preload="none"
        playsInline
        aria-label={title}
        onPlay={() => setStarted(true)}
        className="block aspect-video w-full"
      />
      {started ? null : (
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            countPlay(src, counted);
            void ref.current?.play().catch(() => {});
          }}
          className="group absolute inset-0 flex items-center justify-center bg-ink/5 hover:bg-transparent"
          aria-label={label}
        >
          <PlayBadge />
        </button>
      )}
    </div>
  );
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** A video with a list of its chapters beside it: choosing one plays from there. */
export function ChapteredVideo({
  src,
  poster,
  title,
  label,
  chapters,
  className,
}: {
  src: string;
  poster: string;
  title: string;
  label: string;
  chapters: ReadonlyArray<{ at: number; title: string; body?: string }>;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const counted = useRef(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const play = (at?: number) => {
    const v = ref.current;
    if (!v) return;
    setStarted(true);
    countPlay(src, counted);
    if (at !== undefined) v.currentTime = at;
    void v.play().catch(() => {});
  };
  const active = started ? chapters.reduce((found, c, i) => (c.at <= time ? i : found), 0) : -1;
  return (
    <div className={clsx("grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]", className)}>
      <div className={clsx(frame, "self-start")}>
        <video
          ref={ref}
          src={src}
          poster={poster}
          controls={started}
          preload="none"
          playsInline
          aria-label={title}
          onPlay={() => setStarted(true)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          className="block aspect-video w-full"
        />
        {started ? null : (
          <button type="button" onClick={() => play()} className="group absolute inset-0 flex items-center justify-center bg-ink/5 hover:bg-transparent" aria-label={label}>
            <PlayBadge />
          </button>
        )}
      </div>
      <ol className="space-y-1" aria-label="Steps in this video">
        {chapters.map((c, i) => (
          <li key={c.at}>
            <button
              type="button"
              onClick={() => play(c.at)}
              aria-current={i === active ? "step" : undefined}
              className={clsx(
                "flex w-full gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                i === active ? "border-line bg-surface shadow-[var(--shadow-card)]" : "border-transparent hover:bg-paper-2",
              )}
            >
              <span className="mt-0.5 w-9 shrink-0 font-mono text-xs text-muted tabular">{clock(c.at)}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{c.title}</span>
                {c.body ? <span className="mt-0.5 block text-sm leading-snug text-ink-2">{c.body}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A button that plays the setup guide in a pop-up, so nobody loses their place. */
export function GuideVideoButton({ className, children }: { className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const counted = useRef(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          dialog.current?.showModal();
          countPlay(VIDEOS.guide.src, counted);
          void video.current?.play().catch(() => {});
        }}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-label={VIDEOS.guide.title}
        onClose={() => video.current?.pause()}
        onClick={(e) => {
          // A click on the backdrop lands on the dialog itself.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[min(960px,calc(100vw-2rem))] max-w-none overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/60"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="font-semibold">{VIDEOS.guide.title}</p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink"
            aria-label="Close the video"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <video ref={video} src={VIDEOS.guide.src} poster={VIDEOS.guide.poster} controls preload="none" playsInline className="block aspect-video w-full bg-ink" />
        <p className="px-4 py-3 text-sm text-muted">
          <Link href="/guide" className="font-medium text-ink underline underline-offset-2">
            Open the guide
          </Link>{" "}
          to jump straight to any of the 8 steps.
        </p>
      </dialog>
    </>
  );
}
