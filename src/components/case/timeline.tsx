import clsx from "clsx";
import {
  CalendarCheck,
  CheckCircle2,
  CircleDot,
  FileText,
  Hammer,
  Mail,
  MessageSquare,
  PhoneMissed,
  ShieldCheck,
  Timer,
  Upload,
  UserCheck,
} from "lucide-react";
import type { EventRow } from "@/lib/cases/service";
import { formatInstant } from "@/lib/rules/calendar";

const ICONS: Record<string, typeof CircleDot> = {
  created: Timer,
  investigation_booked: CalendarCheck,
  investigation_completed: ShieldCheck,
  summary_issued: FileText,
  summary_reissued: FileText,
  delay_notice: Timer,
  email_sent: Mail,
  approval_requested: UserCheck,
  approval_responded: UserCheck,
  approval_cancelled: UserCheck,
  repair_commenced: Hammer,
  repair_completed: CheckCircle2,
  safety_work_completed: ShieldCheck,
  supplementary_steps: Hammer,
  documents_uploaded: Upload,
  contact_attempt: PhoneMissed,
  access_refused: PhoneMissed,
  tenant_contact: MessageSquare,
  landlord_contact: MessageSquare,
  note: MessageSquare,
  case_closed: CheckCircle2,
  case_reopened: CircleDot,
};

export function Timeline({ events }: { events: EventRow[] }) {
  const ordered = [...events].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.recordedAt.getTime() - a.recordedAt.getTime(),
  );
  if (!ordered.length) return <p className="text-sm text-muted">Nothing recorded yet.</p>;
  return (
    <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-line">
      {ordered.map((e) => {
        const Icon = ICONS[e.type] ?? CircleDot;
        const backdated = Math.abs(e.recordedAt.getTime() - e.occurredAt.getTime()) > 60 * 60 * 1000;
        return (
          <li key={e.id} className="relative flex gap-3">
            <span
              className={clsx(
                "relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-surface",
                e.actorType === "landlord" ? "border-info/40 text-info" : e.actorType === "system" ? "border-line text-faint" : "border-line-strong text-ink",
              )}
              aria-hidden
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm leading-relaxed text-ink break-words">{e.summary}</p>
              <p className="mt-0.5 text-xs text-muted tabular">
                {formatInstant(e.occurredAt)}
                {e.actorLabel ? ` · ${e.actorLabel}` : ""}
                {backdated ? ` · recorded ${formatInstant(e.recordedAt)}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
