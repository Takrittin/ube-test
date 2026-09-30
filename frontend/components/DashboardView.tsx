"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Scale,
} from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import type { AIRecommendation, InspectionRecord } from "@/lib/types";

type Period = "today" | "7d" | "all";

interface DashboardViewProps {
  records: InspectionRecord[];
  loading: boolean;
  onRefresh: () => void;
  onStartInspection: () => void;
}

const OUTCOMES: Array<{ label: AIRecommendation; color: string }> = [
  { label: "Pass", color: "bg-emerald-500" },
  { label: "Fail", color: "bg-rose-500" },
  { label: "Manual Review", color: "bg-amber-500" },
];

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DashboardView({
  records,
  loading,
  onRefresh,
  onStartInspection,
}: DashboardViewProps) {
  const [period, setPeriod] = useState<Period>("all");

  const filtered = useMemo(() => {
    if (period === "all") return records;
    const now = new Date();
    const cutoff = new Date(now);
    if (period === "today") cutoff.setHours(0, 0, 0, 0);
    else cutoff.setDate(now.getDate() - 6);
    return records.filter(
      (record) => new Date(record.inspection_timestamp) >= cutoff,
    );
  }, [period, records]);

  const total = filtered.length;
  const passCount = filtered.filter(
    (record) => record.inspector_final_decision === "Pass",
  ).length;
  const failCount = filtered.filter(
    (record) => record.inspector_final_decision === "Fail",
  ).length;
  const comparableRecords = filtered.filter(
    (record) => record.ai_recommendation !== "Manual Review",
  );
  const overrideCount = comparableRecords.filter(
    (record) => record.ai_recommendation !== record.inspector_final_decision,
  ).length;
  const agreementCount = comparableRecords.length - overrideCount;

  const defects = [
    "Torn or Damaged Bag",
    "Printing Defect",
    "Stain or Contamination",
  ].map((label) => ({
    label,
    value: filtered.filter((record) => record.ai_defect_category === label)
      .length,
  }));
  const maxDefect = Math.max(1, ...defects.map((defect) => defect.value));

  const daily = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
          date,
        ),
      };
    });
    return days.map((day) => ({
      ...day,
      value: records.filter(
        (record) => record.inspection_timestamp.slice(0, 10) === day.key,
      ).length,
    }));
  }, [records]);
  const maxDaily = Math.max(1, ...daily.map((day) => day.value));

  const attentionRecords = filtered
    .filter((record) => record.inspector_final_decision !== "Pass")
    .slice(0, 5);

  return (
    <main className="min-w-0 flex-1 bg-[#f3f5f7] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Quality overview</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              Inspection dashboard
            </h1>
            <p className="mt-1 text-sm text-muted">
              Performance calculated from saved inspection records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="dashboard-period" className="sr-only">
              Dashboard period
            </label>
            <select
              id="dashboard-period"
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-ube-600 focus:ring-2 focus:ring-ube-100"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="all">All records</option>
            </select>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink hover:border-ube-600"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={onStartInspection}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ube-700 px-4 text-sm font-bold text-white hover:bg-ube-800"
            >
              New inspection <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Quality indicators">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-muted">Inspections</p><ClipboardCheck size={18} className="text-ube-700" /></div>
            <p className="mt-3 text-3xl font-bold text-ink">{total}</p>
            <p className="mt-1 text-xs text-muted">Completed records</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-muted">Pass rate</p><CheckCircle2 size={18} className="text-emerald-600" /></div>
            <p className="mt-3 text-3xl font-bold text-ink">{percent(passCount, total)}%</p>
            <p className="mt-1 text-xs text-muted">{passCount} passed inspections</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-muted">Needs attention</p><AlertTriangle size={18} className="text-amber-600" /></div>
            <p className="mt-3 text-3xl font-bold text-ink">{failCount}</p>
            <p className="mt-1 text-xs text-muted">Failed inspections</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-muted">Override rate</p><Scale size={18} className="text-ube-700" /></div>
            <p className="mt-3 text-3xl font-bold text-ink">{percent(overrideCount, total)}%</p>
            <p className="mt-1 text-xs text-muted">{overrideCount} decisions changed</p>
          </div>
        </section>

        {total === 0 ? (
          <section className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <ClipboardCheck className="mx-auto text-slate-400" size={30} />
            <h2 className="mt-4 text-base font-bold text-ink">No dashboard data yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Complete and save inspections to populate quality trends and defect analysis.
            </p>
            <button type="button" onClick={onStartInspection} className="primary-button mt-5">
              Start first inspection
            </button>
          </section>
        ) : (
          <>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="outcomes-title">
                <div className="flex items-start justify-between gap-4"><div><h2 id="outcomes-title" className="text-base font-bold text-ink">Final inspection outcomes</h2><p className="mt-1 text-xs text-muted">Disposition of completed inspections</p></div><span className="text-sm font-bold text-ink">{total} total</span></div>
                <div className="mt-6 flex h-5 overflow-hidden rounded-sm bg-slate-100" role="img" aria-label={`${passCount} passed and ${failCount} failed`}>
                  {OUTCOMES.map((outcome) => {
                    const value = filtered.filter((record) => record.inspector_final_decision === outcome.label).length;
                    return value > 0 ? <div key={outcome.label} className={outcome.color} style={{ width: `${percent(value, total)}%` }} /> : null;
                  })}
                </div>
                <div className="mt-5 space-y-3">{OUTCOMES.map((outcome) => { const value = filtered.filter((record) => record.inspector_final_decision === outcome.label).length; return <div key={outcome.label} className="flex items-center gap-3 text-sm"><span className={`h-2.5 w-2.5 rounded-sm ${outcome.color}`} /><span className="flex-1 text-slate-700">{outcome.label}</span><span className="font-semibold text-ink">{value}</span><span className="w-10 text-right text-muted">{percent(value, total)}%</span></div>; })}</div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="defects-title">
                <h2 id="defects-title" className="text-base font-bold text-ink">Defect categories</h2>
                <p className="mt-1 text-xs text-muted">AI-identified possible defects</p>
                <div className="mt-6 space-y-5">{defects.map((defect) => <div key={defect.label}><div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-700">{defect.label}</span><span className="font-semibold text-ink">{defect.value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-sm bg-slate-100"><div className="h-full bg-ube-600" style={{ width: `${(defect.value / maxDefect) * 100}%` }} /></div></div>)}</div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="activity-title">
                <h2 id="activity-title" className="text-base font-bold text-ink">Inspection activity</h2>
                <p className="mt-1 text-xs text-muted">Saved records during the last seven days</p>
                <div className="mt-6 flex h-44 items-end gap-2 border-b border-slate-200 px-1" role="img" aria-label="Inspection count by day for the last seven days">
                  {daily.map((day) => <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="mb-1 text-xs font-semibold text-ink">{day.value || ""}</span><div className="mx-auto w-full max-w-10 rounded-t-sm bg-ube-600" style={{ height: `${day.value === 0 ? 2 : Math.max(12, (day.value / maxDaily) * 120)}px` }} /><span className="mt-2 text-[11px] font-semibold text-muted">{day.label}</span></div>)}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="agreement-title">
                <h2 id="agreement-title" className="text-base font-bold text-ink">AI and final decision agreement</h2>
                <p className="mt-1 text-xs text-muted">How often the final decision matches the recommendation</p>
                <div className="mt-8 flex items-end justify-between"><div><p className="text-4xl font-bold text-ink">{percent(agreementCount, comparableRecords.length)}%</p><p className="mt-1 text-sm text-muted">Agreement rate</p></div><p className="text-right text-sm text-muted"><strong className="block text-lg text-ink">{overrideCount}</strong>overrides</p></div>
                <div className="mt-6 h-3 overflow-hidden rounded-sm bg-slate-100" role="img" aria-label={`${agreementCount} matching decisions and ${overrideCount} overrides`}><div className="h-full bg-ube-600" style={{ width: `${percent(agreementCount, comparableRecords.length)}%` }} /></div>
                <div className="mt-3 flex justify-between text-xs text-muted"><span>{agreementCount} matched</span><span>{overrideCount} changed</span></div>
              </section>
            </div>

            <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-base font-bold text-ink">Recent inspections requiring attention</h2><p className="mt-1 text-xs text-muted">Failed inspection records</p></div>
              {attentionRecords.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">No records currently require attention.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Inspection ID</th><th className="px-5 py-3">Lot</th><th className="px-5 py-3">Decision</th><th className="px-5 py-3">Defect</th><th className="px-5 py-3">Recorded</th></tr></thead><tbody className="divide-y divide-slate-200">{attentionRecords.map((record) => <tr key={record.inspection_id}><td className="px-5 py-3 font-mono text-xs font-semibold text-ube-700">{record.inspection_id}</td><td className="px-5 py-3 font-semibold text-ink">{record.lot_number}</td><td className="px-5 py-3"><StatusBadge value={record.inspector_final_decision} /></td><td className="px-5 py-3 text-slate-700">{record.ai_defect_category}</td><td className="px-5 py-3 text-xs text-muted">{formatTime(record.inspection_timestamp)}</td></tr>)}</tbody></table></div>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
