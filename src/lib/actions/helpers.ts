import { unstable_rethrow } from "next/navigation";
import { compareIso, fromLondonLocal, isIsoDate, londonDateOf } from "@/lib/rules/calendar";

export class ActionError extends Error {}

export interface ActionState {
  error?: string;
  message?: string;
  ok?: boolean;
  draft?: string;
}

export function str(fd: FormData, key: string, max = 4000): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function optStr(fd: FormData, key: string, max = 4000): string | null {
  const v = str(fd, key, max);
  return v ? v : null;
}

export function bool(fd: FormData, key: string): boolean | null {
  const v = str(fd, key, 10);
  if (v === "yes" || v === "true" || v === "on") return true;
  if (v === "no" || v === "false") return false;
  return null;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[], fallback?: T): T {
  const v = str(fd, key, 64) as T;
  if (allowed.includes(v)) return v;
  if (fallback !== undefined) return fallback;
  throw new ActionError(`Choose a valid option for ${key.replace(/_/g, " ")}.`);
}

export function isoDateField(fd: FormData, key: string, label: string, required = true): string | null {
  const v = str(fd, key, 10);
  if (!v) {
    if (required) throw new ActionError(`Enter ${label}.`);
    return null;
  }
  if (!isIsoDate(v)) throw new ActionError(`${label[0].toUpperCase()}${label.slice(1)} isn't a valid date.`);
  return v;
}

/**
 * Parse a UK-local date + time pair from a form. Rejects future instants unless allowed —
 * statutory clocks must not be gamed by back- or forward-dating beyond reason.
 */
export function dateTimeField(
  fd: FormData,
  prefix: string,
  label: string,
  opts: { allowFuture?: boolean; notBefore?: Date | null } = {},
): Date {
  const date = isoDateField(fd, `${prefix}_date`, label)!;
  const time = str(fd, `${prefix}_time`, 5) || "09:00";
  if (!/^\d{2}:\d{2}$/.test(time)) throw new ActionError(`Enter a valid time for ${label}.`);
  const instant = fromLondonLocal(date, time);
  if (compareIso(date, "2024-01-01") < 0) throw new ActionError(`${label[0].toUpperCase()}${label.slice(1)} is too far in the past.`);
  if (!opts.allowFuture && instant.getTime() > Date.now() + 5 * 60_000) {
    throw new ActionError(`${label[0].toUpperCase()}${label.slice(1)} can't be in the future.`);
  }
  if (opts.notBefore && londonDateOf(instant) < londonDateOf(opts.notBefore)) {
    throw new ActionError(`${label[0].toUpperCase()}${label.slice(1)} can't be before ${londonDateOf(opts.notBefore)}.`);
  }
  return instant;
}

export function penceField(fd: FormData, key: string): number | null {
  const raw = str(fd, key, 20).replace(/[£,\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new ActionError("Enter a valid amount in pounds.");
  return Math.round(n * 100);
}

export function emailField(fd: FormData, key: string): string | null {
  const v = str(fd, key, 254).toLowerCase();
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new ActionError("Enter a valid email address.");
  return v;
}

export function toState(err: unknown): ActionState {
  // Let Next.js redirect/notFound control-flow errors propagate.
  unstable_rethrow(err);
  if (err instanceof ActionError) return { error: err.message };
  console.error(err);
  return { error: "Something went wrong. Please try again." };
}
