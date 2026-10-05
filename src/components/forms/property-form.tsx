"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { FormPendingContext, SubmitButton } from "@/components/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { useToast } from "@/components/toast";
import { savePropertyAction } from "@/lib/actions/org";
import type { ActionState } from "@/lib/actions/helpers";

export interface PropertyFormValues {
  id?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  jurisdiction: "scotland" | "england";
  sector: "private" | "social";
  tenantName?: string | null;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  notes?: string | null;
  landlordId?: string | null;
}

export function PropertyForm({
  values,
  landlords,
  isAgent,
  onDoneHref,
}: {
  values: PropertyFormValues;
  landlords: Array<{ id: string; name: string }>;
  isAgent: boolean;
  onDoneHref?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const { state, pending, onSubmit } = useFormAction<ActionState>(async (prev, fd) => {
    const res = await savePropertyAction(prev, fd);
    if (res.ok && res.message) toast(res.message);
    return res;
  }, {});
  // Editing keeps the saved link (or "none"); a new home must make an explicit choice.
  const [landlordChoice, setLandlordChoice] = useState(values.id ? (values.landlordId ?? "none") : landlords.length ? "" : "new");
  useEffect(() => {
    if (!state.ok) return;
    if (values.id && onDoneHref) router.push(onDoneHref);
    else {
      ref.current?.reset();
      setLandlordChoice(landlords.length ? "" : "new");
    }
  }, [state, values.id, onDoneHref, router, landlords.length]);

  return (
    <FormPendingContext.Provider value={pending}>
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
      {values.id ? <input type="hidden" name="propertyId" value={values.id} /> : null}
      {state.error ? <Alert tone="bad">{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Address line 1" htmlFor="addressLine1" className="sm:col-span-2">
          <Input id="addressLine1" name="addressLine1" required defaultValue={values.addressLine1} placeholder="Flat 2/1, 14 Dalmeny Street" />
        </Field>
        <Field label="Address line 2" htmlFor="addressLine2">
          <Input id="addressLine2" name="addressLine2" defaultValue={values.addressLine2 ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Town" htmlFor="city">
            <Input id="city" name="city" defaultValue={values.city ?? ""} />
          </Field>
          <Field label="Postcode" htmlFor="postcode">
            <Input id="postcode" name="postcode" defaultValue={values.postcode ?? ""} />
          </Field>
        </div>
        <Field label="Nation" htmlFor="jurisdiction">
          <Select id="jurisdiction" name="jurisdiction" defaultValue={values.jurisdiction}>
            <option value="scotland">Scotland</option>
            <option value="england">England</option>
          </Select>
        </Field>
        <Field label="Tenancy type" htmlFor="sector">
          <Select id="sector" name="sector" defaultValue={values.sector}>
            <option value="private">Private rented</option>
            <option value="social">Social housing</option>
          </Select>
        </Field>
        <Field label="Tenant name" htmlFor="tenantName">
          <Input id="tenantName" name="tenantName" defaultValue={values.tenantName ?? ""} autoComplete="off" />
        </Field>
        <Field label="Tenant email" htmlFor="tenantEmail">
          <Input id="tenantEmail" name="tenantEmail" type="email" defaultValue={values.tenantEmail ?? ""} autoComplete="off" />
        </Field>
        <Field label="Tenant phone" htmlFor="tenantPhone">
          <Input id="tenantPhone" name="tenantPhone" type="tel" defaultValue={values.tenantPhone ?? ""} autoComplete="off" />
        </Field>
        {isAgent ? (
          <Field label="Landlord (owner)" htmlFor="landlordId">
            <Select id="landlordId" name="landlordId" value={landlordChoice} onChange={(e) => setLandlordChoice(e.target.value)} required>
              <option value="" disabled>
                Choose…
              </option>
              {landlords.map((l) => (
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
        {isAgent && landlordChoice === "new" ? (
          <>
            <Field label="Landlord name" htmlFor="landlordName">
              <Input id="landlordName" name="landlordName" required autoComplete="off" />
            </Field>
            <Field label="Landlord email" htmlFor="landlordEmail">
              <Input id="landlordEmail" name="landlordEmail" type="email" autoComplete="off" />
            </Field>
          </>
        ) : null}
        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea id="notes" name="notes" rows={2} defaultValue={values.notes ?? ""} placeholder="Access arrangements, keys, known history…" />
        </Field>
      </div>
      <SubmitButton pendingLabel="Saving…">{values.id ? "Save changes" : "Add home"}</SubmitButton>
    </form>
    </FormPendingContext.Provider>
  );
}
