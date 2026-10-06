/** The two product videos, served from public/videos (see scripts/video/README.md to rebuild them). */
export const VIDEOS = {
  overview: {
    src: "/videos/overview.mp4",
    poster: "/videos/overview.jpg",
    title: "RepairClock in 90 seconds",
    description: "What RepairClock does: statutory clocks for every damp and mould report, landlord approvals, tenant letters and the evidence pack.",
    duration: "PT1M31S",
  },
  guide: {
    src: "/videos/setup-guide.mp4",
    poster: "/videos/setup-guide.jpg",
    title: "Set up RepairClock in 8 steps",
    description:
      "A 2-minute walkthrough: create your account, set up your agency, import your homes, log a damp or mould report, get the landlord's approval, send the written summary, invite your team and choose a plan.",
    duration: "PT2M15S",
  },
} as const;

/** Where each step starts in the setup guide, in seconds. */
export const GUIDE_CHAPTERS = [
  { at: 0, title: "What you'll do", body: "The 8 steps at a glance." },
  { at: 9, title: "1. Create your free account", body: "“Start free trial”, then your name, work email and a password. No card needed." },
  { at: 21, title: "2. Set up your agency", body: "Letting agent, Scotland, your agency's name and phone number: they go on tenant letters." },
  { at: 33, title: "3. Add your homes", body: "Upload a spreadsheet from your property software, or add homes one by one." },
  { at: 46, title: "4. Log a damp or mould report", body: "Pick the home, describe the problem and when you found out. Every deadline is worked out for you." },
  { at: 63, title: "5. Get the landlord's approval", body: "Send a link with the work and the price. They approve without logging in." },
  { at: 78, title: "6. Send the written summary", body: "Record the visit. RepairClock drafts the tenant's summary and emails it in your agency's name." },
  { at: 95, title: "7. Invite your team", body: "Settings → invite a colleague. Everyone gets their own login." },
  { at: 105, title: "8. Choose your plan", body: "Plan & billing: Agent covers 300 homes and 5 people for £99 a month + VAT. Switch or cancel any time." },
];
