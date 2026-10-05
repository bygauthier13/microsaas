import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_minmax(420px,520px)]">
      <aside className="relative hidden lg:flex flex-col justify-between bg-ink text-white p-12 overflow-hidden">
        <Logo className="text-white [&_span]:text-white" />
        <div className="max-w-md">
          <p className="eyebrow !text-[#f3b183]">From 6 October 2026</p>
          <p className="display mt-3 text-4xl leading-[1.15]">
            Every damp and mould report in a Scottish rented home now carries a legal clock.
          </p>
          <ul className="mt-8 space-y-3 text-[0.95rem] text-white/80">
            <li><span className="font-mono text-[#f3b183] mr-2">10</span> working days to investigate</li>
            <li><span className="font-mono text-[#f3b183] mr-2">03</span> working days to issue a written summary</li>
            <li><span className="font-mono text-[#f3b183] mr-2">05</span> working days to start repairs</li>
          </ul>
        </div>
        <p className="text-xs text-white/50">
          Investigation and Commencement of Repair (Scotland) Regulations 2026 · Awaab’s Law (England, social housing)
        </p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden mb-8">
          <Logo />
        </div>
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-sm mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
