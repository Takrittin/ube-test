"use client";

import { ArrowLeft, ChevronRight, History, LoaderCircle, Search, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { assetUrl } from "@/lib/api";
import type { InspectionRecord } from "@/lib/types";

interface RecordsViewProps {
  records: InspectionRecord[];
  loading: boolean;
  search: string;
  selected: InspectionRecord | null;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onSelect: (record: InspectionRecord | null) => void;
  onDelete: (record: InspectionRecord) => Promise<void>;
  onStartInspection: () => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RecordsView({ records, loading, search, selected, onSearchChange, onSearch, onSelect, onDelete, onStartInspection }: RecordsViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    onSearch();
  }

  async function deleteSelectedRecord() {
    if (!selected) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(selected);
      setConfirmDelete(false);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete the record.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-w-0 flex-1 bg-[#f3f5f7] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Traceability</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Inspection records</h1><p className="mt-1 text-sm text-muted">Search saved records and review inspection evidence.</p></div>
          <div className="flex flex-wrap gap-2">
            {selected && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError("");
                  setConfirmDelete(true);
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-rose-300 bg-white px-5 text-sm font-bold text-rose-700 transition hover:border-rose-500 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <Trash2 size={17} />
                Delete record
              </button>
            )}
            <button type="button" onClick={onStartInspection} className="primary-button">New inspection<ChevronRight size={17} /></button>
          </div>
        </div>

        {!selected ? <>
          <form onSubmit={submitSearch} className="mt-6 flex max-w-xl gap-2"><label htmlFor="record-search" className="sr-only">Search lot number</label><input id="record-search" className="text-field" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search by lot number" /><button type="submit" className="primary-button shrink-0"><Search size={17} />Search</button></form>
          <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {loading ? <div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin text-ube-700" size={28} /></div> : records.length === 0 ? <div className="grid min-h-64 place-items-center px-6 text-center"><div><History className="mx-auto text-slate-400" size={30} /><h2 className="mt-4 text-base font-bold text-ink">No inspection records found</h2><p className="mt-2 text-sm text-muted">Complete an inspection or try a different lot number.</p></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Inspection ID</th><th className="px-5 py-3">Lot number</th><th className="px-5 py-3">AI result</th><th className="px-5 py-3">Final decision</th><th className="px-5 py-3">Confidence</th><th className="px-5 py-3">Recorded</th><th className="w-12 px-3 py-3"><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y divide-slate-200">{records.map((record) => <tr key={record.inspection_id} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs font-semibold text-ube-700">{record.inspection_id}</td><td className="px-5 py-4 font-semibold text-ink">{record.lot_number}</td><td className="px-5 py-4"><StatusBadge value={record.ai_recommendation} /></td><td className="px-5 py-4"><StatusBadge value={record.inspector_final_decision} /></td><td className="px-5 py-4 font-semibold text-ink">{record.confidence_score}%</td><td className="px-5 py-4 text-xs text-muted">{formatTime(record.inspection_timestamp)}</td><td className="px-3 py-4"><button type="button" onClick={() => onSelect(record)} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-ube-50 hover:text-ube-800" aria-label={`Open inspection ${record.inspection_id}`}><ChevronRight size={18} /></button></td></tr>)}</tbody></table></div>}
          </section>
        </> : <section className="mt-6"><button type="button" onClick={() => onSelect(null)} className="secondary-button min-h-10"><ArrowLeft size={17} />Back to records</button><div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]"><div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100"><img src={assetUrl(selected.image_url)} alt={`Inspection image for ${selected.lot_number}`} className="aspect-[16/10] h-full w-full object-contain" /></div><div className="rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><p className="font-mono text-xs font-semibold text-ube-700">{selected.inspection_id}</p><h2 className="mt-1 text-lg font-bold text-ink">{selected.lot_number}</h2></div><dl className="divide-y divide-slate-200"><div className="grid grid-cols-2 gap-3 px-5 py-3"><dt className="text-sm text-muted">Product</dt><dd className="text-right text-sm font-semibold text-ink">{selected.product_name}</dd></div><div className="grid grid-cols-2 gap-3 px-5 py-3"><dt className="text-sm text-muted">AI recommendation</dt><dd className="text-right"><StatusBadge value={selected.ai_recommendation} /></dd></div><div className="grid grid-cols-2 gap-3 px-5 py-3"><dt className="text-sm text-muted">Final decision</dt><dd className="text-right"><StatusBadge value={selected.inspector_final_decision} /></dd></div><div className="grid grid-cols-2 gap-3 px-5 py-3"><dt className="text-sm text-muted">Confidence</dt><dd className="text-right text-sm font-semibold text-ink">{selected.confidence_score}%</dd></div><div className="grid grid-cols-2 gap-3 px-5 py-3"><dt className="text-sm text-muted">Defect category</dt><dd className="text-right text-sm font-semibold text-ink">{selected.ai_defect_category}</dd></div><div className="grid grid-cols-2 gap-3 px-5 py-3"><dt className="text-sm text-muted">Recorded</dt><dd className="text-right text-xs font-semibold text-ink">{formatTime(selected.inspection_timestamp)}</dd></div></dl>{selected.inspector_note && <div className="border-t border-slate-200 px-5 py-4"><p className="data-label">Inspection note</p><p className="mt-2 text-sm leading-6 text-slate-700">{selected.inspector_note}</p></div>}{selected.override_reason && <div className="border-t border-amber-200 bg-amber-50 px-5 py-4"><p className="data-label text-amber-900">Override reason</p><p className="mt-2 text-sm leading-6 text-amber-900">{selected.override_reason}</p></div>}</div></div></section>}
      </div>

      {confirmDelete && selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-record-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700">
                <Trash2 size={19} />
              </span>
              <div>
                <h2 id="delete-record-title" className="text-lg font-bold text-ink">
                  Delete inspection record?
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {selected.inspection_id} for lot {selected.lot_number} and its
                  uploaded image will be permanently deleted.
                </p>
              </div>
            </div>
            {deleteError && (
              <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="secondary-button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteSelectedRecord()}
                disabled={deleting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-rose-700 px-5 text-sm font-bold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {deleting ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
