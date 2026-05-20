"use client";

import { createEmptySheet, createInitialSheet, SheetState, MealColumns, fieldLabel, mealFieldOrder } from "../../lib/sheet";
import { PrintableSheet } from "../../components/Printable";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatItalianDate } from "../../lib/date";

type Patient = {
  id: number;
  firstName: string;
  lastName: string;
};

type ControlRecord = {
  controlDate: string;
  weekTitle: string;
};

export default function EditorPage() {
  const [sheet, setSheet] = useState<SheetState>(() => createEmptySheet());
  const [viewMode, setViewMode] = useState<'split' | 'expanded'>('expanded');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [exportDialog, setExportDialog] = useState<{ visible: boolean; fileName: string }>({
    visible: false,
    fileName: '',
  });
  const [hasPatientContext, setHasPatientContext] = useState(false);
  const [modal, setModal] = useState<{
    type: 'error' | 'success' | 'info';
    title: string;
    message: string;
    visible: boolean;
  }>({
    type: 'info',
    title: '',
    message: '',
    visible: false,
  });
  const dayPanelStyles = [
    { card: 'bg-gradient-to-br from-sky-50 via-white to-sky-100/70 ring-sky-200/70', chip: 'bg-sky-100 text-sky-700', title: 'text-sky-900' },
    { card: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 ring-emerald-200/70', chip: 'bg-emerald-100 text-emerald-700', title: 'text-emerald-900' },
    { card: 'bg-gradient-to-br from-amber-50 via-white to-amber-100/70 ring-amber-200/70', chip: 'bg-amber-100 text-amber-700', title: 'text-amber-900' },
    { card: 'bg-gradient-to-br from-rose-50 via-white to-rose-100/70 ring-rose-200/70', chip: 'bg-rose-100 text-rose-700', title: 'text-rose-900' },
    { card: 'bg-gradient-to-br from-violet-50 via-white to-violet-100/70 ring-violet-200/70', chip: 'bg-violet-100 text-violet-700', title: 'text-violet-900' },
    { card: 'bg-gradient-to-br from-cyan-50 via-white to-cyan-100/70 ring-cyan-200/70', chip: 'bg-cyan-100 text-cyan-700', title: 'text-cyan-900' },
    { card: 'bg-gradient-to-br from-lime-50 via-white to-lime-100/70 ring-lime-200/70', chip: 'bg-lime-100 text-lime-700', title: 'text-lime-900' },
  ];
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [controlDate, setControlDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [controlRecords, setControlRecords] = useState<ControlRecord[]>([]);
  const [selectedRecordKey, setSelectedRecordKey] = useState('');
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? null;
  const recordKey = (record: ControlRecord) => `${record.controlDate}__${record.weekTitle}`;

  const showModal = (type: 'error' | 'success' | 'info', title: string, message: string) => {
    setModal({ type, title, message, visible: true });
    setTimeout(() => setModal((m) => ({ ...m, visible: false })), 3000);
  };

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

  const loadPatients = async () => {
    const res = await fetch('/api/patients', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to load patients');
    }

    const data = (await res.json()) as { patients: Patient[] };
    setPatients(data.patients);
    return data.patients;
  };

  const loadControlRecords = async (patientId: number) => {
    const res = await fetch(`/api/diets?patientId=${patientId}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to load control records');
    }

    const data = (await res.json()) as { controlRecords: ControlRecord[] };
    setControlRecords(data.controlRecords);
  };

  const loadDietRecordByRecord = async (patientId: number, date: string, weekTitle?: string) => {
    const query = new URLSearchParams({
      patientId: String(patientId),
      controlDate: date,
    });
    if (weekTitle) {
      query.set('weekTitle', weekTitle);
    }
    const res = await fetch(`/api/diets?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to load diet');
    }

    const data = (await res.json()) as { diet: { sheet: SheetState } | null };
    if (!data.diet) {
      return false;
    }

    setSheet(data.diet.sheet);
    setSelectedRecordKey(recordKey({ controlDate: date, weekTitle: data.diet.sheet.weekTitle }));
    return true;
  };

  const saveDietRecord = async () => {
    if (!selectedPatientId) {
      showModal('error', 'Paziente non selezionato', 'Seleziona un paziente prima di salvare');
      return;
    }

    if (!controlDate) {
      showModal('error', 'Data non inserita', 'Inserisci la data di controllo prima di salvare');
      return;
    }

    try {
      const res = await fetch('/api/diets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          controlDate,
          weekTitle: sheet.weekTitle,
          sheet,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save diet');
      }

      await loadControlRecords(selectedPatientId);
      setSelectedRecordKey(recordKey({ controlDate, weekTitle: sheet.weekTitle }));
      showModal('success', 'Dieta salvata', `${formatItalianDate(controlDate)} - ${sheet.weekTitle}`);
    } catch (error) {
      console.error(error);
      showModal('error', 'Errore salvataggio', 'Impossibile salvare la dieta');
    }
  };

  const loadDietRecord = async () => {
    if (!selectedPatientId || !controlDate) {
      setStatusMessage('Seleziona paziente e data');
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    try {
      const loaded = await loadDietRecordByRecord(selectedPatientId, controlDate, sheet.weekTitle);
      if (!loaded) {
        setStatusMessage(`Nessuna dieta per ${formatItalianDate(controlDate)} e ${sheet.weekTitle}`);
        setTimeout(() => setStatusMessage(null), 2200);
        return;
      }

      setStatusMessage(`Dieta caricata (${formatItalianDate(controlDate)} - ${sheet.weekTitle})`);
      setTimeout(() => setStatusMessage(null), 2200);
    } catch (error) {
      console.error(error);
      setStatusMessage('Errore caricamento dieta');
      setTimeout(() => setStatusMessage(null), 2200);
    }
  };

  useEffect(() => {
    void loadPatients().catch((error) => {
      console.error(error);
      setStatusMessage('Errore caricamento pazienti');
      setTimeout(() => setStatusMessage(null), 2200);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const patientIdFromQuery = Number(params.get('patientId'));
    const controlDateFromQuery = params.get('controlDate');
    const weekTitleFromQuery = params.get('weekTitle');
    const isNewDietFromQuery = params.get('new') === '1';

    if (!Number.isInteger(patientIdFromQuery) || patientIdFromQuery <= 0) {
      setHasPatientContext(false);
      return;
    }

    setHasPatientContext(true);

    if (!patients.length) {
      return;
    }

    if (Number.isInteger(patientIdFromQuery) && patientIdFromQuery > 0) {
      const exists = patients.some((patient) => patient.id === patientIdFromQuery);
      if (exists && patientIdFromQuery !== selectedPatientId) {
        setSelectedPatientId(patientIdFromQuery);
      }

      if (controlDateFromQuery) {
        setControlDate(controlDateFromQuery);
        if (weekTitleFromQuery && !isNewDietFromQuery) {
          void loadDietRecordByRecord(patientIdFromQuery, controlDateFromQuery, weekTitleFromQuery).then((loaded) => {
            if (!loaded) {
              setStatusMessage(`Nessuna dieta per ${formatItalianDate(controlDateFromQuery)} e ${weekTitleFromQuery}`);
              setTimeout(() => setStatusMessage(null), 2200);
            }
          }).catch((error) => {
            console.error(error);
            setStatusMessage('Errore caricamento dieta da link');
            setTimeout(() => setStatusMessage(null), 2200);
          });
        } else if (!isNewDietFromQuery) {
          void loadDietRecordByRecord(patientIdFromQuery, controlDateFromQuery).then((loaded) => {
            if (!loaded) {
              setStatusMessage(`Nessuna dieta per ${formatItalianDate(controlDateFromQuery)}`);
              setTimeout(() => setStatusMessage(null), 2200);
            }
          }).catch((error) => {
            console.error(error);
            setStatusMessage('Errore caricamento dieta da link');
            setTimeout(() => setStatusMessage(null), 2200);
          });
        }
      }
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) {
      setControlRecords([]);
      setSelectedRecordKey('');
      return;
    }

    const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
    if (selectedPatient) {
      updateSheet('patientName', `${selectedPatient.firstName} ${selectedPatient.lastName}`.toUpperCase());
    }

    void loadControlRecords(selectedPatientId).catch((error) => {
      console.error(error);
      setStatusMessage('Errore caricamento controlli');
      setTimeout(() => setStatusMessage(null), 2200);
    });
  }, [selectedPatientId, patients]);

  const exportPdf = async (requestedName: string) => {
    // Check if date is selected
    if (!controlDate) {
      setExportDialog({ visible: false, fileName: '' });
      showModal('error', 'Data non selezionata', 'Seleziona una data di controllo prima di esportare il PDF');
      return false;
    }

    // Check if patient is selected
    if (!selectedPatientId) {
      setExportDialog({ visible: false, fileName: '' });
      showModal('error', 'Paziente non selezionato', 'Seleziona un paziente prima di esportare il PDF');
      return false;
    }

    // First, save the diet
    try {
      const savRes = await fetch('/api/diets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          controlDate,
          weekTitle: sheet.weekTitle,
          sheet,
        }),
      });

      if (!savRes.ok) {
        throw new Error('Failed to save diet');
      }

      await loadControlRecords(selectedPatientId);
      setSelectedRecordKey(recordKey({ controlDate, weekTitle: sheet.weekTitle }));
    } catch (error) {
      console.error(error);
      setExportDialog({ visible: false, fileName: '' });
      showModal('error', 'Errore salvataggio', 'Impossibile salvare la dieta prima di esportare il PDF');
      return false;
    }

    // Then export PDF
    try {
      const fileName = normalizePdfFileName(requestedName);
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet,
          fileName,
        }),
      });
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
      return true;
    } catch (err) {
      console.error(err);
      setExportDialog({ visible: false, fileName: '' });
      showModal('error', 'Errore download', 'Errore durante il download del PDF');
      return false;
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      {statusMessage ? (
        <div className="fixed top-4 right-4 z-50 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
          {statusMessage}
        </div>
      ) : null}

      {modal.visible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/95 p-6 shadow-xl ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-4">
              <div className={`mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1 ${
                modal.type === 'error' ? 'bg-red-50 text-red-700 ring-red-100' :
                modal.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' :
                'bg-blue-50 text-blue-700 ring-blue-100'
              }`}>
                {modal.type === 'error' ? '⚠️ Errore' : modal.type === 'success' ? '✓ Successo' : 'ℹ️ Info'}
              </div>
              <h2 className="text-xl font-semibold text-slate-900">{modal.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{modal.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModal((m) => ({ ...m, visible: false }))}
                className="flex-1 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportDialog.visible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/60 bg-white/95 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-5">
              <div className="mb-3 inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 ring-1 ring-sky-100">
                Esporta PDF
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Scegli il nome del file</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                Puoi modificare il nome suggerito prima di scaricare il PDF.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Nome file</span>
              <input
                autoFocus
                value={exportDialog.fileName}
                onChange={(event) => setExportDialog((current) => ({ ...current, fileName: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setExportDialog({ visible: false, fileName: '' });
                  }

                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void exportPdf(exportDialog.fileName).then((success) => {
                      if (success) {
                        setExportDialog({ visible: false, fileName: '' });
                      }
                    });
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-base text-slate-900 outline-none transition shadow-sm placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setExportDialog({ visible: false, fileName: '' })}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  void exportPdf(exportDialog.fileName).then((success) => {
                    if (success) {
                      setExportDialog({ visible: false, fileName: '' });
                    }
                  });
                }}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
              >
                Esporta
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!hasPatientContext ? (
        <div className="mx-auto flex min-h-screen max-w-[800px] items-center px-4 py-12">
          <div className="w-full rounded-[28px] border border-white/60 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 ring-1 ring-amber-100">
              Paziente richiesto
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Prima seleziona o crea un paziente</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              L'editor si apre solo dopo aver scelto un paziente dalla home oppure dalla pagina archivio.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/" className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800">
                Vai alla home pazienti
              </Link>
              <Link href="/pazienti" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                Apri archivio pazienti
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {hasPatientContext ? (
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-50">
                    Cambia paziente
                  </Link>
                  <Link href="/pazienti" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-50">
                    Archivio pazienti
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExportDialog({
                      visible: true,
                      fileName: buildPdfFilenamePreset({
                        controlDate,
                        protocolTitle: sheet.protocolTitle,
                        weekTitle: sheet.weekTitle,
                        patientName: selectedPatient?.lastName && selectedPatient?.firstName
                          ? `${selectedPatient.lastName} ${selectedPatient.firstName}`
                          : sheet.patientName,
                      }),
                    });
                  }}
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
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 p-5 shadow-sm ring-1 ring-slate-100">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_0_5px_rgba(99,102,241,0.14)]" />
                  <h2 className="text-lg font-semibold text-slate-900">Paziente e controllo</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <LabeledSelect
                    label="Paziente"
                    value={selectedPatientId === '' ? '' : String(selectedPatientId)}
                    options={patients.map((patient) => ({
                      value: String(patient.id),
                      label: `${patient.lastName} ${patient.firstName}`,
                    }))}
                    placeholder="Seleziona paziente"
                    onChange={(value) => setSelectedPatientId(value ? Number(value) : '')}
                  />

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Data controllo</span>
                    <input
                      type="date"
                      value={controlDate}
                      onChange={(event) => setControlDate(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition shadow-sm focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveDietRecord}
                    className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none"
                  >
                    Salva dieta per data
                  </button>
                  <button
                    type="button"
                    onClick={loadDietRecord}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none"
                  >
                    Carica dieta della data
                  </button>
                  <Link href="/pazienti" className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100">
                    Gestisci pazienti
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <LabeledSelect
                    label="Diete salvate"
                    value={selectedRecordKey}
                    options={controlRecords.map((record) => ({
                      value: recordKey(record),
                      label: `${formatItalianDate(record.controlDate)} - ${record.weekTitle}`,
                    }))}
                    placeholder={selectedPatientId ? 'Seleziona una dieta salvata' : 'Seleziona prima un paziente'}
                    onChange={(value) => {
                      setSelectedRecordKey(value);
                      const record = controlRecords.find((item) => recordKey(item) === value);
                      if (!record) {
                        return;
                      }

                      if (!selectedPatientId) {
                        return;
                      }

                      setControlDate(record.controlDate);
                      updateSheet('weekTitle', record.weekTitle);
                      void loadDietRecordByRecord(selectedPatientId, record.controlDate, record.weekTitle).catch((error) => {
                        console.error(error);
                        setStatusMessage('Errore caricamento dieta selezionata');
                        setTimeout(() => setStatusMessage(null), 2200);
                      });
                    }}
                  />
                  <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
                    {selectedPatientId
                      ? `Diete salvate: ${controlRecords.length}`
                      : 'Seleziona un paziente per vedere lo storico delle date'}
                  </div>
                </div>
              </div>

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
      ) : null}
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

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition shadow-sm focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// use fieldLabel from shared lib

function normalizePdfFileName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'dieta.pdf';
  }

  const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitized) {
    return 'dieta.pdf';
  }

  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

function buildPdfFilenamePreset({
  controlDate,
  protocolTitle,
  weekTitle,
  patientName,
}: {
  controlDate: string;
  protocolTitle: string;
  weekTitle: string;
  patientName: string;
}) {
  const parts = [
    'CONTROLLO del',
    formatItalianDate(controlDate),
    protocolTitle,
    weekTitle,
    patientName,
  ]
    .map((part) => part.trim())
    .filter(Boolean);

  return `${parts.join(' ')}.pdf`;
}
