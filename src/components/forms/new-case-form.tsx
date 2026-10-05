"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ClockStrip } from "@/components/duty";
import { createCaseAction } from "@/lib/actions/cases";
import type { ActionState } from "@/lib/actions/helpers";
import { SOURCES } from "@/lib/domain";
import { HAZARDS, type HazardKey } from "@/lib/rules/hazards";
import { evaluateCase } from "@/lib/rules/engine";
import { fromLondonLocal, isIsoDate } from "@/lib/rules/calendar";

interface PropertyOption {
  id: string;
  label: string;
  jurisdiction: "scotland" | "england";
  sector: "private" | "social";
}

export function NewCaseForm(props: {
  properties: PropertyOption[];
  landlords: Array<{ id: string; name: string }>;
  defaultJurisdiction: "scotland" | "england";
  defaultSector: "private" | "social";
  isAgent: boolean;
  todayIso: string;
  nowTime: string;
  preselectPropertyId?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createCaseAction, {});
  const [propertyId, setPropertyId] = useState(props.preselectPropertyId ?? (props.properties.length ? props.properties[0].id : "new"));
  const [jurisdiction, setJurisdiction] = useState(props.defaultJurisdiction);
  const [sector, setSector] = useState(props.defaultSector);
  const [hazard, setHazard] = useState<HazardKey>("damp_mould");
  const [triage, setTriage] = useState<"significant" | "emergency">("significant");
  const [date, setDate] = useState(props.todayIso);
  const [time, setTime] = useState(props.nowTime);
  const [landlordChoice, setLandlordChoice] = useState(props.landlords.length ? props.landlords[0].id : props.isAgent ? "new" : "none");

  const selected = props.properties.find((p) => p.id === propertyId);
  const effJurisdiction = selected?.jurisdiction ?? jurisdiction;
  const effSector = selected?.sector ?? sector;

  const preview = useMemo(() => {
    if (!isIsoDate(date)) return null;
    try {
      const awareAt = fromLondonLocal(date, /^\d{2}:\d{2}$/.test(time) ? time : "09:00");
      return evaluateCase({ jurisdiction: effJurisdiction, sector: effSector, hazard, triage, awareAt }, new Date());
    } catch {
      return null;
    }
  }, [date, time, effJurisdiction, effSector, hazard, triage]);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-8 min-w-0">
        {state.error ? <Alert tone="bad">{state.error}</Alert> : null}

        <section className="card p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold">Which home?</h2>
          <Field label="Property" htmlFor="propertyId">
            <Select id="propertyId" name="propertyId" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {props.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="new">+ Add a new home</option>
            </Select>
          </Field>
          {propertyId === "new" ? (
            <div className="grid gap-4 sm:grid-cols-2 border-t border-line pt-4">
              <Field label="Address line 1" htmlFor="addressLine1" className="sm:col-span-2">
                <Input id="addressLine1" name="addressLine1" required placeholder="Flat 2/1, 14 Dalmeny Street" autoComplete="off" />
              </Field>
              <Field label="Address line 2" htmlFor="addressLine2">
                <Input id="addressLine2" name="addressLine2" autoComplete="off" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Town" htmlFor="city">
                  <Input id="city" name="city" placeholder="Edinburgh" />
                </Field>
                <Field label="Postcode" htmlFor="postcode">
                  <Input id="postcode" name="postcode" placeholder="EH6 8PG" />
                </Field>
              </div>
              <Field label="Nation" htmlFor="jurisdiction" hint="Decides which law and bank holidays apply.">
                <Select id="jurisdiction" name="jurisdiction" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value as "scotland" | "england")}>
                  <option value="scotland">Scotland</option>
                  <option value="england">England</option>
                </Select>
              </Field>
              <Field label="Tenancy type" htmlFor="sector">
                <Select id="sector" name="sector" value={sector} onChange={(e) => setSector(e.target.value as "private" | "social")}>
                  <option value="private">Private rented</option>
                  <option value="social">Social housing</option>
                </Select>
              </Field>
              <Field label="Tenant name" htmlFor="tenantName">
                <Input id="tenantName" name="tenantName" autoComplete="off" />
              </Field>
              <Field label="Tenant email" htmlFor="tenantEmail" hint="To send the written summary.">
                <Input id="tenantEmail" name="tenantEmail" type="email" autoComplete="off" />
              </Field>
              <Field label="Tenant phone" htmlFor="tenantPhone">
                <Input id="tenantPhone" name="tenantPhone" type="tel" autoComplete="off" />
              </Field>
              {props.isAgent ? (
                <Field label="Landlord (owner)" htmlFor="landlordId" hint="Needed for one-click approval links.">
                  <Select id="landlordId" name="landlordId" value={landlordChoice} onChange={(e) => setLandlordChoice(e.target.value)}>
                    {props.landlords.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                    <option value="new">+ New landlord</option>
                    <option value="none">No landlord / we own it</option>
                  </Select>
                </Field>
              ) : (
                <input type="hidden" name="landlordId" value="none" />
              )}
              {props.isAgent && landlordChoice === "new" ? (
                <>
                  <Field label="Landlord name" htmlFor="landlordName">
                    <Input id="landlordName" name="landlordName" autoComplete="off" />
                  </Field>
                  <Field label="Landlord email" htmlFor="landlordEmail">
                    <Input id="landlordEmail" name="landlordEmail" type="email" autoComplete="off" />
                  </Field>
                </>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="card p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold">What was reported?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issue" htmlFor="hazard">
              <Select id="hazard" name="hazard" value={hazard} onChange={(e) => setHazard(e.target.value as HazardKey)}>
                {HAZARDS.map((h) => (
                  <option key={h.key} value={h.key}>
                    {h.label}
                  </option>
                ))}
              </Select>
            </Field>
            {effJurisdiction === "england" ? (
              <Field label="Initial triage" htmlFor="triage" hint="Emergency = a reasonable landlord would make it safe within 24 hours.">
                <Select id="triage" name="triage" value={triage} onChange={(e) => setTriage(e.target.value as "significant" | "emergency")}>
                  <option value="significant">Potential significant hazard (10 working days)</option>
                  <option value="emergency">Potential emergency hazard (24 hours)</option>
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="triage" value="significant" />
            )}
            <Field label="Date you became aware" htmlFor="aware_date" hint="The clock starts here — not when a contractor is instructed.">
              <Input id="aware_date" name="aware_date" type="date" value={date} max={props.todayIso} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Time (UK)" htmlFor="aware_time">
              <Input id="aware_time" name="aware_time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="How you found out" htmlFor="source">
              <Select id="source" name="source" defaultValue="tenant_report">
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reported by" htmlFor="reportedBy">
              <Input id="reportedBy" name="reportedBy" placeholder="e.g. Tenant by email" />
            </Field>
          </div>
          <Field label="What did they report?" htmlFor="description" hint="Where it is, how big, how long it's been there. Paste the tenant's message if you have it.">
            <Textarea id="description" name="description" rows={4} required placeholder="Black mould spreading across the bedroom ceiling above the window, about 1m². Tenant says it came back after cleaning two weeks ago." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rooms affected" htmlFor="rooms">
              <Input id="rooms" name="rooms" placeholder="Bedroom 2, bathroom" />
            </Field>
            <Field label="Household vulnerability (optional)" htmlFor="vulnerability" hint="Children, age, health conditions — may warrant a faster response.">
              <Input id="vulnerability" name="vulnerability" placeholder="Child under 5 with asthma" />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="lg" pendingLabel="Starting the clock…">Log report &amp; start the clock</SubmitButton>
          <p className="text-sm text-muted">You can add photos and record the investigation on the next screen.</p>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 self-start space-y-3">
        <div className="card p-4">
          <p className="eyebrow">Live preview</p>
          <p className="mt-1 text-sm text-muted">Deadlines if you log this report now.</p>
          <div className="mt-3">
            {preview ? (
              preview.duties.length ? (
                <ClockStrip evaluation={preview} compact stack />
              ) : (
                <p className="text-sm text-muted">{preview.scopeNote}</p>
              )
            ) : (
              <p className="text-sm text-muted">Enter a valid date.</p>
            )}
          </div>
          {preview?.scopeNote && preview.duties.length ? <p className="mt-3 text-xs text-muted leading-relaxed">{preview.scopeNote}</p> : null}
          {preview ? <p className="mt-3 text-xs text-faint">{preview.regimeLabel}</p> : null}
        </div>
      </aside>
    </form>
  );
}
