"use client";

import { createInitialSheet, SheetState, MealColumns, fieldLabel, mealFieldOrder } from "../lib/sheet";
import { PrintableSheet } from "../components/Printable";
import { useState } from "react";

export default function Home() {
  const [sheet, setSheet] = useState<SheetState>(() => createInitialSheet());
  const [viewMode, setViewMode] = useState<'split' | 'expanded'>('expanded');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const dayPanelStyles = [
    { card: 'bg-gradient-to-br from-sky-50 via-white to-sky-100/70 ring-sky-200/70', chip: 'bg-sky-100 text-sky-700', title: 'text-sky-900' },
    { card: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 ring-emerald-200/70', chip: 'bg-emerald-100 text-emerald-700', title: 'text-emerald-900' },
    { card: 'bg-gradient-to-br from-amber-50 via-white to-amber-100/70 ring-amber-200/70', chip: 'bg-amber-100 text-amber-700', title: 'text-amber-900' },
    { card: 'bg-gradient-to-br from-rose-50 via-white to-rose-100/70 ring-rose-200/70', chip: 'bg-rose-100 text-rose-700', title: 'text-rose-900' },
    { card: 'bg-gradient-to-br from-violet-50 via-white to-violet-100/70 ring-violet-200/70', chip: 'bg-violet-100 text-violet-700', title: 'text-violet-900' },
    { card: 'bg-gradient-to-br from-cyan-50 via-white to-cyan-100/70 ring-cyan-200/70', chip: 'bg-cyan-100 text-cyan-700', title: 'text-cyan-900' },
    { card: 'bg-gradient-to-br from-lime-50 via-white to-lime-100/70 ring-lime-200/70', chip: 'bg-lime-100 text-lime-700', title: 'text-lime-900' },
  ];

  const toggleViewMode = () => setViewMode((m) => (m === 'split' ? 'expanded' : 'split'));
  const _toggleViewMode = () => {
    setStatusMessage(`Modalità: ${viewMode === 'split' ? 'estesa' : 'split'} (toggle)`);
    toggleViewMode();
    setTimeout(() => setStatusMessage(null), 1500);
  };

  const updateSheet = <K extends keyof SheetState>(
    key: K,
    value: SheetState[K],
  ) => {
    setSheet((current) => ({ ...current, [key]: value }));
  };

  const updateFixedRow = <K extends keyof MealColumns>(
    key: K,
    value: string,
  ) => {
    setSheet((current) => ({
      ...current,
      fixedRow: { ...current.fixedRow, [key]: value },
    }));
  };

  const updateDayMeal = (
    dayId: string,
    mealKey: keyof MealColumns,
    value: string,
  ) => {
    setSheet((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: { ...day.meals, [mealKey]: value },
            }
          : day,
      ),
    }));
  };

  const resetExample = () => setSheet(createInitialSheet());

  const exportPdf = async () => {
    try {
      const requestedName = window.prompt('Con che nome vuoi salvare il PDF?', 'dieta.pdf');
      if (requestedName === null) {
        setStatusMessage('Download annullato');
        setTimeout(() => setStatusMessage(null), 1500);
        return;
      }

      const fileName = normalizePdfFileName(requestedName);
      const res = await fetch('/api/generate-pdf');
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatusMessage(`Scaricato come ${fileName}`);
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (err) {
      console.error(err);
      alert('Errore durante il download del PDF');
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      {statusMessage ? (
        <div className="fixed top-4 right-4 z-50 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
          {statusMessage}
        </div>
      ) : null}
      <div className="container mx-auto max-w-[1600px] flex gap-8 items-start py-8 px-4">
        <aside className={viewMode === 'expanded' ? 'w-full' : 'w-[520px]'}>
          <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/60 pb-5">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 ring-1 ring-sky-100">
                  Diet Studio
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Modifica la dieta</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Un editor più pulito, con spazi aria e una preview pensata per lavorare meglio sui dettagli.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStatusMessage('Generazione PDF...'); exportPdf().then(()=>setStatusMessage('Download avviato')).catch(()=>setStatusMessage('Errore generazione PDF')).finally(()=>setTimeout(()=>setStatusMessage(null),2000)); }}
                  className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none"
                >
                  Esporta PDF
                </button>
                <button
                  type="button"
                  onClick={_toggleViewMode}
                  aria-pressed={viewMode === 'expanded'}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none"
                >
                  {viewMode === 'split' ? 'Vista estesa' : 'Vista split'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm ring-1 ring-slate-100">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_0_5px_rgba(14,165,233,0.12)]" />
                  <h2 className="text-lg font-semibold text-slate-900">Intestazione</h2>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <LabeledInput label="Protocollo" value={sheet.protocolTitle} onChange={(value) => updateSheet("protocolTitle", value)} />
                  <LabeledInput label="Titolo settimana" value={sheet.weekTitle} onChange={(value) => updateSheet("weekTitle", value)} />
                  <LabeledInput label="Paziente" value={sheet.patientName} onChange={(value) => updateSheet("patientName", value)} />
                  <LabeledInput label="Nota in alto a destra" value={sheet.topNote} onChange={(value) => updateSheet("topNote", value)} />
                  <LabeledInput label="Firma riga 1" value={sheet.footerLine1} onChange={(value) => updateSheet("footerLine1", value)} />
                  <LabeledInput label="Firma riga 2" value={sheet.footerLine2} onChange={(value) => updateSheet("footerLine2", value)} />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-amber-50/80 via-white to-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_0_5px_rgba(245,158,11,0.12)]" />
                  <h2 className="text-lg font-semibold text-slate-900">Riga fissa</h2>
                </div>
                <p className="text-sm text-slate-500">La riga “TUTTI I GIORNI” resta uguale in ogni piano.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {mealFieldOrder.map((field) => (
                    <LabeledTextarea key={field} label={fieldLabel(field)} value={sheet.fixedRow[field]} rows={4} onChange={(value) => updateFixedRow(field, value)} />
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm ring-1 ring-slate-100">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]" />
                  <h2 className="text-lg font-semibold text-slate-900">Piani giornalieri</h2>
                </div>
                <div className="space-y-3">
                  {sheet.days.map((day, index) => {
                    const style = dayPanelStyles[index % dayPanelStyles.length];
                    return (
                      <article key={day.id} className={`overflow-hidden rounded-2xl border p-4 shadow-sm ring-1 ${style.card}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${style.chip}`}>
                              Giorno {index + 1}
                            </div>
                            <h3 className={`mt-2 text-sm font-semibold uppercase tracking-[0.12em] ${style.title}`}>{day.label}</h3>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {mealFieldOrder.map((field) => (
                            <LabeledTextarea key={`${day.id}-${field}`} label={fieldLabel(field)} value={day.meals[field]} rows={field === "colazione" ? 6 : field === "pranzo" || field === "cena" ? 6 : 5} onChange={(value) => updateDayMeal(day.id, field, value)} />
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </aside>

        {viewMode === 'split' ? (
          <section className="flex-1">
            <div className="rounded-[28px] border border-white/60 bg-white/85 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/60 backdrop-blur">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200/70 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Anteprima</p>
                  <h2 className="text-lg font-semibold text-slate-900">Layout di stampa</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">PDF ready</span>
              </div>
              <PrintableSheet sheet={sheet} />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}



function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition shadow-sm placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition shadow-sm focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

// use fieldLabel from shared lib

function normalizePdfFileName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'dieta.pdf';
  }

  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}
