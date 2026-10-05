import { DeadlineCalculator } from "@/components/marketing/deadline-calculator";
import { londonDateOf } from "@/lib/rules/calendar";

export const revalidate = 3600;

export const metadata = {
  title: "Damp & mould deadline calculator (Scotland 2026 rules & Awaab’s Law)",
  description:
    "Free working-day calculator for UK landlords and letting agents. Enter the date you became aware of damp or mould and get the investigation, written summary and repair deadlines — with Scottish and English bank holidays excluded.",
  alternates: { canonical: "/tools/deadline-calculator" },
};

export default function CalculatorPage() {
  const today = londonDateOf(new Date());
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Free tool</p>
      <h1 className="display mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">Damp and mould deadline calculator</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
        Working days are counted from the day <em>after</em> you became aware, skipping weekends and the correct bank holidays for Scotland or England — including one-offs
        like Scotland&apos;s 15 June 2026 holiday.
      </p>
      <div className="mt-10">
        <DeadlineCalculator todayIso={today} />
      </div>
      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted">
        Based on the Investigation and Commencement of Repair (Scotland) Regulations 2026 (SSI 2026/173) and the Hazards in Social Housing (Prescribed Requirements) (England)
        Regulations 2025, with bank holidays from GOV.UK. A planning aid, not legal advice — check the Regulations and guidance for your circumstances.
      </p>
    </section>
  );
}
