import { Bell, ClipboardCheck, History } from "lucide-react";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-white/10 bg-ink text-white shadow-lg shadow-slate-900/10">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="UBE Smart Inspection home">
          <span className="grid h-10 w-14 place-items-center rounded bg-white text-lg font-black italic tracking-[-0.12em] text-ube-700 shadow-sm">
            UBE
          </span>
          <span>
            <span className="block text-sm font-extrabold leading-tight tracking-tight text-white">
              Smart Inspection &amp; Traceability
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-200">
              UBE Chemicals (Asia) · Rayong Plant
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 px-3 text-xs font-semibold text-sky-100 md:inline-flex">
            <Bell size={15} aria-hidden="true" />
            Shift A · Packaging Line 2
          </span>
          <Link
            href="/#inspection-history"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 text-sm font-bold text-white transition hover:bg-white/20"
          >
          <History size={17} aria-hidden="true" />
          <span className="hidden sm:inline">Recent records</span>
          <span className="sm:hidden">History</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
