"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { recordInvestigationAction } from "@/lib/actions/cases";
import { CAUSES } from "@/lib/domain";
import { addCalendarDays, addWorkingDays, formatIsoDate, isIsoDate } from "@/lib/rules/calendar";
import { ActionForm } from "./action-form";

export function InvestigationForm(props: {
  caseId: string;
  jurisdiction: "scotland" | "england";
  todayIso: string;
  nowTime: string;
  awareIso: string;
  defaultInvestigator?: string | null;
}) {
  const scotland = props.jurisdiction === "scotland";
  const region = scotland ? "scotland" : "england-and-wales";
  const [date, setDate] = useState(props.todayIso);
  const [method, setMethod] = useState<"in_person" | "remote">("in_person");
  const [found, setFound] = useState<"" | "yes" | "no">("");
  const repairBy = isIsoDate(date) ? addWorkingDays(date, 5, region) : null;
  const summaryBy = isIsoDate(date) ? addWorkingDays(date, 3, region) : null;

  return (
    <ActionForm action={recordInvestigationAction} className="space-y-4">
      <input type="hidden" name="caseId" value={props.caseId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Investigation date" htmlFor="completed_date">
          <Input
            id="completed_date"
            name="completed_date"
            type="date"
            value={date}
            min={props.awareIso}
            max={props.todayIso}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Time finished" htmlFor="completed_time">
          <Input id="completed_time" name="completed_time" type="time" defaultValue={props.nowTime} />
        </Field>
        <Field label="Method" htmlFor="method">
          <Select id="method" name="method" value={method} onChange={(e) => setMethod(e.target.value as "in_person" | "remote")}>
            <option value="in_person">In person</option>
            <option value="remote">Remote (video / photos)</option>
          </Select>
        </Field>
      </div>
      <Field
        label="Who investigated"
        htmlFor="investigators"
        hint="Name and organisation — this goes in the tenant's written summary."
      >
        <Input
          id="investigators"
          name="investigators"
          required
          defaultValue={props.defaultInvestigator ?? ""}
          placeholder="Sam Reid, Reid Damp Surveys Ltd"
        />
      </Field>
      {method === "remote" ? (
        <Field label="Why was a remote investigation justified?" htmlFor="remoteJustification" hint="Guidance expects in person unless there's a good reason.">
          <Textarea id="remoteJustification" name="remoteJustification" rows={2} required placeholder="Tenant self-isolating; clear video walkthrough with moisture readings provided." />
        </Field>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {scotland ? "Is the home substantially free from damp and mould?" : "Did the investigation confirm a significant or emergency hazard?"}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(scotland
            ? [
                { v: "yes", title: "No — repair work is needed", body: "Repairs must begin within 5 working days." },
                { v: "no", title: "Yes — substantially free", body: "Explain why no work is needed in the summary." },
              ]
            : [
                { v: "yes", title: "Yes — hazard confirmed", body: "Safety work clock starts now." },
                { v: "no", title: "No significant or emergency hazard", body: "Explain why in the summary." },
              ]
          ).map((o) => (
            <label
              key={o.v}
              className="flex cursor-pointer gap-3 rounded-lg border border-line-strong bg-surface p-3 has-[:checked]:border-ink has-[:checked]:ring-2 has-[:checked]:ring-ink/10"
            >
              <input
                type="radio"
                name="hazardFound"
                value={o.v}
                required
                checked={found === o.v}
                onChange={() => setFound(o.v as "yes" | "no")}
                className="mt-1 accent-[var(--color-ink)]"
              />
              <span>
                <span className="block text-sm font-medium">{o.title}</span>
                <span className="block text-xs text-muted">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {!scotland && found === "yes" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Severity confirmed" htmlFor="foundSeverity">
            <Select id="foundSeverity" name="foundSeverity" defaultValue="significant">
              <option value="significant">Significant hazard (make safe within 5 working days)</option>
              <option value="emergency">Emergency hazard (make safe within 24 hours)</option>
            </Select>
          </Field>
          <Field label="Preventative (supplementary) work needed?" htmlFor="supplementaryRequired">
            <Select id="supplementaryRequired" name="supplementaryRequired" defaultValue="yes">
              <option value="yes">Yes — to stop it coming back</option>
              <option value="no">No — safety work fully resolves it</option>
            </Select>
          </Field>
        </div>
      ) : null}

      <Field
        label="What was found"
        htmlFor="findings"
        hint="Rough site notes are fine — the written summary turns them into a letter. Include readings, extent and rooms."
      >
        <Textarea
          id="findings"
          name="findings"
          rows={4}
          required
          placeholder="Black mould approx 1.2m² on bedroom 2 ceiling and window reveal. Surface moisture 28% WME. Extractor fan in bathroom not working. No signs of penetrating damp externally."
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Likely cause" htmlFor="cause">
          <Select id="cause" name="cause" defaultValue="">
            <option value="">Choose…</option>
            {CAUSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Work done during the visit (if any)" htmlFor="workDoneOnVisit">
          <Input id="workDoneOnVisit" name="workDoneOnVisit" placeholder="Mould wash treatment applied to ceiling" />
        </Field>
      </div>
      {found === "yes" ? (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Field label={scotland ? "Repair work required" : "Safety / repair work required"} htmlFor="workRequired">
            <Textarea
              id="workRequired"
              name="workRequired"
              rows={2}
              placeholder="Replace bathroom extractor fan with humidistat model; treat and redecorate bedroom 2 ceiling with anti-mould paint."
            />
          </Field>
          {scotland ? (
            <Field
              label="Target date to begin repairs"
              htmlFor="targetRepairStart"
              hint={repairBy ? `Legal latest: ${formatIsoDate(repairBy)}` : undefined}
            >
              <Input id="targetRepairStart" name="targetRepairStart" type="date" min={date} defaultValue={repairBy ?? undefined} />
            </Field>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton pendingLabel="Saving…">Record investigation</SubmitButton>
        {summaryBy ? (
          <p className="text-sm text-muted">
            Written summary will be due {formatIsoDate(summaryBy)}
            {found === "yes" && repairBy && scotland ? `; repairs must begin by ${formatIsoDate(repairBy)}` : ""}.
            {!scotland && found === "yes" ? ` Preventative work must start by ${formatIsoDate(addCalendarDays(date, 84))}.` : ""}
          </p>
        ) : null}
      </div>
    </ActionForm>
  );
}
