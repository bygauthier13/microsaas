import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  const { user, org } = await requireUser();
  if (org) redirect("/app");
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Step 1 of 2</p>
      <h1 className="display text-3xl sm:text-4xl mt-1">Set up your workspace</h1>
      <p className="mt-2 text-muted max-w-xl">
        Thirty seconds. Then log a damp or mould report and watch RepairClock work out every legal deadline for you.
      </p>
      <div className="mt-8">
        <OnboardingForm defaultName={user.name} defaultEmail={user.email} />
      </div>
    </div>
  );
}
