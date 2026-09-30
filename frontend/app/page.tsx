"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileImage,
  ListChecks,
  LoaderCircle,
  Menu,
  PanelLeftClose,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Upload,
  Wifi,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { DashboardView } from "@/components/DashboardView";
import { RecordsView } from "@/components/RecordsView";
import { apiRequest, assetUrl } from "@/lib/api";
import {
  clearPendingInspection,
  getPendingInspection,
  savePendingInspection,
} from "@/lib/storage";
import type {
  Analysis,
  FinalDecision,
  InspectionRecord,
  Lot,
} from "@/lib/types";

type StepId = 1 | 2 | 3 | 4 | 5;
type AppSection = "dashboard" | "inspection" | "records";

const STEPS: Array<{ id: StepId; label: string; shortLabel: string }> = [
  { id: 1, label: "Identify lot", shortLabel: "Lot" },
  { id: 2, label: "Capture image", shortLabel: "Image" },
  { id: 3, label: "Review result", shortLabel: "Review" },
  { id: 4, label: "Final decision", shortLabel: "Decision" },
  { id: 5, label: "Complete", shortLabel: "Complete" },
];

const SAMPLE_LOTS = ["PB-2026-001", "PB-2026-002", "PB-2026-003"];
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DECISIONS: FinalDecision[] = ["Pass", "Fail"];

export default function InspectionStationPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appSection, setAppSection] = useState<AppSection>("inspection");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>(1);
  const [lotNumber, setLotNumber] = useState("");
  const [lot, setLot] = useState<Lot | null>(null);
  const [lotLoading, setLotLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [finalDecision, setFinalDecision] = useState<FinalDecision | null>(null);
  const [note, setNote] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<InspectionRecord | null>(null);
  const [error, setError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const loadRecords = useCallback(async (query = "") => {
    setHistoryLoading(true);
    try {
      const suffix = query.trim()
        ? `?lot_number=${encodeURIComponent(query.trim())}`
        : "";
      setRecords(
        await apiRequest<InspectionRecord[]>(`/api/inspections${suffix}`),
      );
    } catch {
      // Keep the last successfully loaded records visible during a transient
      // backend connection failure.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const pending = getPendingInspection();
    if (pending) {
      setLot(pending.lot);
      setLotNumber(pending.lot.lot_number);
      setAnalysis(pending.analysis);
      setFinalDecision(pending.final_decision ?? (
        pending.analysis.recommendation === "Manual Review"
          ? null
          : pending.analysis.recommendation
      ));
      setNote(pending.inspector_note ?? "");
      setOverrideReason(pending.override_reason ?? "");
      setActiveStep(pending.active_step === 4 ? 4 : 3);
      setAppSection("inspection");
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    if (lot && analysis && !saved) {
      savePendingInspection({
        lot,
        analysis,
        final_decision: finalDecision,
        inspector_note: note,
        override_reason: overrideReason,
        active_step: activeStep === 4 ? 4 : 3,
      });
    } else {
      clearPendingInspection();
    }
  }, [
    activeStep,
    analysis,
    draftReady,
    finalDecision,
    lot,
    note,
    overrideReason,
    saved,
  ]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const availableStep: StepId = saved ? 5 : analysis ? 4 : lot ? 2 : 1;
  const isOverride = Boolean(
    analysis &&
      analysis.recommendation !== "Manual Review" &&
      finalDecision !== analysis.recommendation,
  );

  function clearDownstreamState() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setAnalysis(null);
    setFinalDecision(null);
    setNote("");
    setOverrideReason("");
    setSaved(null);
  }

  async function lookupLot(value = lotNumber) {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      setError("Enter or scan a lot number.");
      return;
    }
    setLotLoading(true);
    setError("");
    try {
      const found = await apiRequest<Lot>(
        `/api/lots/${encodeURIComponent(normalized)}`,
      );
      clearDownstreamState();
      setLot(found);
      setLotNumber(found.lot_number);
      setActiveStep(2);
    } catch (err) {
      setLot(null);
      setError(err instanceof Error ? err.message : "Lot number not found.");
    } finally {
      setLotLoading(false);
    }
  }

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setAnalysis(null);
    setSaved(null);
    setError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function analyseImage() {
    if (!lot || !file) return;
    setAnalysing(true);
    setError("");
    const formData = new FormData();
    formData.append("lot_number", lot.lot_number);
    formData.append("image", file);
    try {
      const result = await apiRequest<Analysis>("/api/analyse", {
        method: "POST",
        body: formData,
      });
      setAnalysis(result);
      setFinalDecision(
        result.recommendation === "Manual Review"
          ? null
          : result.recommendation,
      );
      setActiveStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image analysis failed.");
    } finally {
      setAnalysing(false);
    }
  }

  async function saveInspection(event: FormEvent) {
    event.preventDefault();
    if (!lot || !analysis) return;
    if (!finalDecision) {
      setError("Select Pass or Fail as the inspector's final decision.");
      return;
    }
    if (isOverride && !overrideReason.trim()) {
      setError("Enter a reason for overriding the AI recommendation.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const record = await apiRequest<InspectionRecord>("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lot_number: lot.lot_number,
          image_filename: analysis.image_filename,
          stored_image_filename: analysis.stored_image_filename,
          ai_recommendation: analysis.recommendation,
          confidence_score: analysis.confidence_score,
          ai_defect_category: analysis.defect_category,
          inspector_final_decision: finalDecision,
          inspector_note: note,
          override_reason: isOverride ? overrideReason : "",
        }),
      });
      setSaved(record);
      setRecords((current) => [record, ...current]);
      setActiveStep(5);
      clearPendingInspection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save inspection.");
    } finally {
      setSaving(false);
    }
  }

  function startNextInspection() {
    clearDownstreamState();
    setLot(null);
    setLotNumber("");
    setError("");
    setActiveStep(1);
  }

  function navigateTo(section: AppSection) {
    setSelectedRecord(null);
    setAppSection(section);
    setMobileSidebarOpen(false);
    if (section === "records") void loadRecords(historySearch);
    if (section === "dashboard") void loadRecords();
  }

  function openInspection() {
    navigateTo("inspection");
  }

  async function deleteRecord(record: InspectionRecord) {
    await apiRequest<{ inspection_id: string }>(
      `/api/inspections/${encodeURIComponent(record.inspection_id)}`,
      { method: "DELETE" },
    );
    setRecords((current) =>
      current.filter((item) => item.inspection_id !== record.inspection_id),
    );
    setSelectedRecord(null);
  }

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-[#f3f5f7]">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
              aria-controls="mobile-sidebar"
              aria-expanded={mobileSidebarOpen}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-ube-500 hover:bg-ube-50 hover:text-ube-800 focus:outline-none focus:ring-2 focus:ring-ube-600 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <button
              type="button"
              onClick={() => setSidebarVisible((visible) => !visible)}
              aria-label={sidebarVisible ? "Hide navigation" : "Open navigation"}
              aria-controls="desktop-sidebar"
              aria-expanded={sidebarVisible}
              className="hidden h-11 w-11 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-ube-500 hover:bg-ube-50 hover:text-ube-800 focus:outline-none focus:ring-2 focus:ring-ube-600 lg:grid"
            >
              {sidebarVisible ? <PanelLeftClose size={20} /> : <Menu size={20} />}
            </button>
            <span className="text-2xl font-black italic tracking-[-0.12em] text-ube-700">
              UBE
            </span>
            <span className="h-7 w-px bg-slate-200" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">Smart Inspection</p>
              <p className="truncate text-xs text-muted">
                Packaging quality and traceability
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Wifi size={15} />Online</span>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside
          id="desktop-sidebar"
          className={`hidden shrink-0 overflow-hidden bg-[#0b3760] text-white transition-[width] duration-200 ease-out lg:flex ${
            sidebarVisible ? "w-60 border-r border-slate-200" : "w-0"
          }`}
        >
          <div className="flex w-60 shrink-0 flex-col">
            <nav className="p-3" aria-label="Main navigation">
              <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200">Workspace</p>
              {([
                ["dashboard", "Dashboard", BarChart3],
                ["inspection", "New inspection", ClipboardCheck],
                ["records", "Inspection records", ListChecks],
              ] as const).map(([section, label, Icon]) => (
                <button key={section} type="button" onClick={() => navigateTo(section)} className={`mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${appSection === section ? "bg-white text-ube-900" : "text-sky-50 hover:bg-white/10"}`} aria-current={appSection === section ? "page" : undefined}>
                  <Icon size={18} />{label}
                </button>
              ))}
            </nav>
            <div className="mt-auto border-t border-white/15 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Production line</p>
              <p className="mt-1 text-sm font-semibold">Packaging Line 2</p>
              <p className="mt-1 font-mono text-xs text-sky-200">PKG-QC-02</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {appSection === "dashboard" && (
            <DashboardView records={records} loading={historyLoading} onRefresh={() => void loadRecords()} onStartInspection={openInspection} />
          )}

          {appSection === "records" && (
            <RecordsView records={records} loading={historyLoading} search={historySearch} selected={selectedRecord} onSearchChange={setHistorySearch} onSearch={() => void loadRecords(historySearch)} onSelect={setSelectedRecord} onDelete={deleteRecord} onStartInspection={openInspection} />
          )}

          {appSection === "inspection" && (<>
      <section className="border-b border-slate-200 bg-[#0b3760] text-white">
        <div className="mx-auto grid min-h-[74px] max-w-7xl items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:px-6">
          {lot ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:flex sm:items-center sm:gap-10">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Active lot</p><p className="mt-0.5 font-mono text-sm font-bold">{lot.lot_number}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Product</p><p className="mt-0.5 text-sm font-semibold">{lot.product_name}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Produced</p><p className="mt-0.5 text-sm font-semibold">{new Date(`${lot.production_date}T00:00:00`).toLocaleDateString()}</p></div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold">No active inspection</p>
              <p className="mt-0.5 text-xs text-sky-200">Identify a production lot to begin.</p>
            </div>
          )}
          <div className="text-left sm:text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Station</p><p className="mt-0.5 font-mono text-sm font-semibold">PKG-QC-02</p></div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Inspection steps" className="rounded-lg border border-slate-200 bg-white p-2 lg:h-fit">
            <ol className="grid grid-cols-5 lg:block">
              {STEPS.map((step) => {
                const complete = step.id < activeStep || (saved && step.id < 5);
                const current = step.id === activeStep;
                const enabled = step.id <= availableStep && !saved;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={!enabled || current}
                      onClick={() => setActiveStep(step.id)}
                      className={`flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-left transition lg:flex-row lg:gap-3 lg:px-3 lg:py-3 ${current ? "bg-ube-50 text-ube-900" : enabled ? "text-slate-700 hover:bg-slate-50" : "text-slate-400"}`}
                      aria-current={current ? "step" : undefined}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${complete ? "border-ube-700 bg-ube-700 text-white" : current ? "border-ube-700 bg-white text-ube-800" : "border-slate-300 bg-white"}`}>
                        {complete ? <Check size={14} strokeWidth={3} /> : step.id}
                      </span>
                      <span className="text-[10px] font-semibold sm:text-xs lg:text-sm lg:font-semibold">
                        <span className="lg:hidden">{step.shortLabel}</span>
                        <span className="hidden lg:inline">{step.label}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section className="min-w-0 rounded-lg border border-slate-200 bg-white">
            {activeStep === 1 && (
              <div className="p-5 sm:p-8">
                <div className="max-w-2xl">
                  <p className="eyebrow">Step 1 of 5</p>
                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Identify production lot</h1>
                  <p className="mt-2 text-sm leading-6 text-muted">Scan the pallet label or enter the lot number shown on the production traveler.</p>
                </div>
                <div className="mt-7 max-w-xl">
                  <label htmlFor="lot-number" className="field-label">Lot number</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input id="lot-number" className="text-field font-mono text-base" value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void lookupLot(); }} placeholder="PB-2026-001" autoFocus />
                    <button type="button" className="primary-button shrink-0" onClick={() => void lookupLot()} disabled={lotLoading}>{lotLoading ? <LoaderCircle className="animate-spin" size={18} /> : <Search size={18} />}Verify lot</button>
                  </div>
                  <button type="button" onClick={() => { setLotNumber("PB-2026-001"); void lookupLot("PB-2026-001"); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ube-800 hover:border-ube-600"><QrCode size={17} />Simulate QR scan</button>
                </div>
                <div className="mt-8 max-w-xl border-t border-slate-200 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Available demo lots</p>
                  <div className="mt-3 flex flex-wrap gap-2">{SAMPLE_LOTS.map((sample) => <button key={sample} type="button" onClick={() => { setLotNumber(sample); void lookupLot(sample); }} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-700 hover:border-ube-500 hover:bg-ube-50">{sample}</button>)}</div>
                </div>
              </div>
            )}

            {activeStep === 2 && lot && (
              <div className="p-5 sm:p-8">
                <p className="eyebrow">Step 2 of 5</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Capture inspection image</h1>
                <p className="mt-2 text-sm leading-6 text-muted">Show the full front surface, top seal, and printed area of one representative bag.</p>
                <input ref={fileInputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} aria-label="Upload product image" />
                {!file ? (
                  <div role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} className={`mt-7 grid min-h-72 cursor-pointer place-items-center rounded-md border-2 border-dashed p-6 text-center ${dragging ? "border-ube-600 bg-ube-50" : "border-slate-300 bg-slate-50 hover:border-ube-500"}`}>
                    <div><Camera className="mx-auto text-ube-700" size={32} /><p className="mt-4 text-base font-bold text-ink">Select or drop a product image</p><p className="mt-1 text-sm text-muted">JPEG, PNG or WebP</p><span className="secondary-button mt-5 min-h-10"><Upload size={16} />Choose image</span></div>
                  </div>
                ) : (
                  <div className="mt-7 grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-100"><img src={previewUrl} alt="Selected inspection image" className="aspect-[16/10] h-full w-full object-contain" /></div>
                    <div className="flex flex-col rounded-md border border-slate-200 p-4"><div className="flex items-start gap-3"><FileImage className="mt-0.5 shrink-0 text-ube-700" size={20} /><div className="min-w-0"><p className="break-words text-sm font-semibold text-ink">{file.name}</p><p className="mt-1 text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p></div></div><button type="button" className="secondary-button mt-5 min-h-10" onClick={() => fileInputRef.current?.click()}><RefreshCw size={16} />Replace image</button><button type="button" className="mt-3 text-sm font-semibold text-rose-700 hover:underline" onClick={() => { setFile(null); setPreviewUrl(""); }}>Remove</button></div>
                  </div>
                )}
                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" className="secondary-button" onClick={() => setActiveStep(1)}><ArrowLeft size={17} />Change lot</button><button type="button" className="primary-button" onClick={() => void analyseImage()} disabled={!file || analysing}>{analysing ? <LoaderCircle className="animate-spin" size={18} /> : <Bot size={18} />}{analysing ? "Analysing image…" : "Analyse image"}</button></div>
              </div>
            )}

            {activeStep === 3 && lot && analysis && (
              <div className="p-5 sm:p-8">
                <p className="eyebrow">Step 3 of 5</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Review analysis result</h1>
                <p className="mt-2 text-sm leading-6 text-muted">Compare the recommendation with the physical product before continuing.</p>
                <div className="mt-7 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-100"><img src={assetUrl(analysis.image_url)} alt={`Inspection image for ${lot.lot_number}`} className="aspect-[16/10] h-full w-full object-contain" /></div>
                  <div className="rounded-md border border-slate-200"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-ink">Analysis evidence</div><dl className="divide-y divide-slate-200"><div className="px-4 py-4"><dt className="data-label">Recommendation</dt><dd className="mt-2"><StatusBadge value={analysis.recommendation} /></dd></div><div className="px-4 py-4"><dt className="data-label">Confidence</dt><dd className="mt-1 text-xl font-bold text-ink">{analysis.confidence_score}%</dd></div><div className="px-4 py-4"><dt className="data-label">Possible defect</dt><dd className="data-value">{analysis.defect_category}</dd></div></dl></div>
                </div>
                <div className="mt-5 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><p><strong>Inspector verification required.</strong> AI output is supporting evidence and cannot release or reject the lot.</p></div>
                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" className="secondary-button" onClick={() => setActiveStep(2)}><ArrowLeft size={17} />Retake image</button><button type="button" className="primary-button" onClick={() => setActiveStep(4)}>Continue to decision<ChevronRight size={17} /></button></div>
              </div>
            )}

            {activeStep === 4 && lot && analysis && (
              <form onSubmit={saveInspection} className="p-5 sm:p-8">
                <p className="eyebrow">Step 4 of 5</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Record final decision</h1>
                <p className="mt-2 text-sm leading-6 text-muted">Select the disposition based on your physical inspection.</p>
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-muted">AI recommendation</span><StatusBadge value={analysis.recommendation} /><span className="text-sm text-muted">· {analysis.confidence_score}% confidence</span></div>
                <fieldset className="mt-7"><legend className="field-label">Inspector final decision <span className="text-rose-700">*</span></legend><p className="mb-3 text-sm text-muted">Complete the physical review and choose Pass or Fail.</p><div className="grid gap-3 sm:grid-cols-2">{DECISIONS.map((decision) => <label key={decision} className={`flex min-h-14 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-bold transition ${finalDecision === decision ? "border-ube-700 bg-ube-50 text-ube-900 ring-1 ring-ube-700" : "border-slate-300 bg-white text-slate-700 hover:border-ube-500"}`}><input type="radio" name="final-decision" className="sr-only" checked={finalDecision === decision} onChange={() => { setFinalDecision(decision); setError(""); }} required />{decision}</label>)}</div></fieldset>
                <div className="mt-6 grid gap-5 md:grid-cols-2"><div><label htmlFor="inspector-note" className="field-label">Inspection note <span className="font-normal text-muted">(optional)</span></label><textarea id="inspector-note" className="text-field min-h-28 resize-y py-3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record observations or handling instructions…" maxLength={1000} /></div>{isOverride ? <div><label htmlFor="override-reason" className="field-label text-amber-900">Override reason <span className="text-rose-700">*</span></label><textarea id="override-reason" className="text-field min-h-28 resize-y border-amber-300 bg-amber-50/40 py-3" value={overrideReason} onChange={(event) => { setOverrideReason(event.target.value); setError(""); }} placeholder="Explain why the physical inspection differs from the recommendation…" required maxLength={1000} /></div> : analysis.recommendation === "Manual Review" ? <div className="rounded-md border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-900">Inspector decision required</p><p className="mt-2 text-sm leading-6 text-amber-900">The AI escalated this image for manual review. Choose Pass or Fail after the physical inspection; this is not treated as an override.</p></div> : <div className="rounded-md border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-ink">Decision aligned</p><p className="mt-2 text-sm leading-6 text-muted">The selected decision matches the AI recommendation. No override reason is required.</p></div>}</div>
                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" className="secondary-button" onClick={() => setActiveStep(3)}><ArrowLeft size={17} />Review evidence</button><button type="submit" className="primary-button" disabled={saving || !finalDecision || (isOverride && !overrideReason.trim())}>{saving ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}{saving ? "Saving inspection…" : "Confirm and save"}</button></div>
              </form>
            )}

            {activeStep === 5 && saved && lot && (
              <div className="p-5 sm:p-8">
                <div className="mx-auto max-w-xl py-6 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={28} strokeWidth={3} /></span><p className="eyebrow mt-5 text-emerald-700">Inspection complete</p><h1 className="mt-2 text-2xl font-bold text-ink">Record saved successfully</h1><p className="mt-2 text-sm leading-6 text-muted">Lot {lot.lot_number} has been recorded with a final decision of {saved.inspector_final_decision}.</p><div className="mx-auto mt-6 max-w-sm rounded-md border border-slate-200 bg-slate-50 px-4 py-4"><p className="data-label">Inspection ID</p><p className="mt-1 font-mono text-lg font-bold text-ube-800">{saved.inspection_id}</p></div><button type="button" className="primary-button mt-7 w-full sm:w-auto" onClick={startNextInspection}>Inspect next lot<ChevronRight size={17} /></button></div>
              </div>
            )}

            {error && <div role="alert" className="mx-5 mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:mx-8 sm:mb-8">{error}</div>}
          </section>
        </div>
        <p className="mt-5 text-center text-xs text-muted">AI recommendations support visual inspection. The assigned inspector remains responsible for the final quality decision.</p>
      </main>
          </>)}
        </div>
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute inset-0 bg-slate-950/45"
          />
          <aside
            id="mobile-sidebar"
            className="relative z-10 flex h-full w-[min(18rem,86vw)] flex-col bg-[#0b3760] text-white shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/15 px-4">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black italic tracking-[-0.12em] text-white">UBE</span>
                <div>
                  <p className="text-sm font-bold">Smart Inspection</p>
                  <p className="text-xs text-sky-200">Main menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close navigation"
                className="grid h-11 w-11 place-items-center rounded-md text-sky-100 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-3" aria-label="Mobile navigation">
              <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200">Workspace</p>
              {([
                ["dashboard", "Dashboard", BarChart3],
                ["inspection", "New inspection", ClipboardCheck],
                ["records", "Inspection records", ListChecks],
              ] as const).map(([section, label, Icon]) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => navigateTo(section)}
                  className={`mt-1 flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                    appSection === section
                      ? "bg-white text-ube-900"
                      : "text-sky-50 hover:bg-white/10"
                  }`}
                  aria-current={appSection === section ? "page" : undefined}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="border-t border-white/15 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Production line</p>
              <p className="mt-1 text-sm font-semibold">Packaging Line 2</p>
              <p className="mt-1 font-mono text-xs text-sky-200">PKG-QC-02</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
