import Link from "next/link";
import clsx from "clsx";

/** Wordmark: a clock face whose hand points at "10" — the 10 working-day investigation window. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx("h-7 w-7", className)} aria-hidden>
      <circle cx="16" cy="16" r="14" fill="#14213d" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#f6f3ec" strokeOpacity=".25" strokeWidth="1" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const a = (i / 12) * Math.PI * 2;
        const r1 = 10.5;
        const r2 = i % 3 === 0 ? 8.2 : 9.3;
        return (
          <line
            key={i}
            x1={16 + Math.sin(a) * r1}
            y1={16 - Math.cos(a) * r1}
            x2={16 + Math.sin(a) * r2}
            y2={16 - Math.cos(a) * r2}
            stroke="#f6f3ec"
            strokeOpacity={i % 3 === 0 ? 0.9 : 0.45}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        );
      })}
      <line x1="16" y1="16" x2="16" y2="8.6" stroke="#f6f3ec" strokeWidth="2" strokeLinecap="round" />
      <line
        x1="16"
        y1="16"
        x2={16 + Math.sin((10 / 12) * Math.PI * 2) * 7}
        y2={16 - Math.cos((10 / 12) * Math.PI * 2) * 7}
        stroke="#f08a4b"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="1.6" fill="#f08a4b" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={clsx("inline-flex items-center gap-2 font-semibold text-ink", className)} aria-label="RepairClock home">
      <LogoMark />
      <span className="text-[1.05rem] tracking-tight">RepairClock</span>
    </Link>
  );
}
