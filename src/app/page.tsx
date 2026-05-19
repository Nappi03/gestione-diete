"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Patient = {
  id: number;
  firstName: string;
  lastName: string;
};

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const showStatus = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(null), 2200);
  };

  const loadPatients = async () => {
    const res = await fetch('/api/patients', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to load patients');
    }

    const data = (await res.json()) as { patients: Patient[] };
    setPatients(data.patients);
  };

  const createPatient = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();

    if (!fn || !ln) {
      showStatus('Inserisci nome e cognome');
      return;
    }

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: fn, lastName: ln }),
      });

      if (!res.ok) {
        throw new Error('Failed to create patient');
      }

      const payload = (await res.json()) as { patient: Patient };
      await loadPatients();
      setSelectedPatientId(payload.patient.id);
      setFirstName('');
      setLastName('');
      showStatus('Paziente creato');
    } catch (error) {
      console.error(error);
      showStatus('Errore creazione paziente');
    }
  };

  useEffect(() => {
    void loadPatients().catch((error) => {
      console.error(error);
      showStatus('Errore caricamento pazienti');
    });
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8">
      {status ? (
        <div className="fixed right-4 top-4 z-50 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
          {status}
        </div>
      ) : null}

      <div className="mx-auto max-w-[1100px] rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/60 backdrop-blur">
        <header className="mb-6 border-b border-slate-200/70 pb-4">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 ring-1 ring-indigo-100">
            Accesso rapido
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Seleziona o crea un paziente</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Prima scegli un paziente oppure creane uno nuovo, poi entra nell'editor per scrivere la dieta.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Pazienti salvati</h2>
            <p className="mt-1 text-sm text-slate-500">Seleziona un paziente per aprire l'editor.</p>

            <div className="mt-4 space-y-2">
              {patients.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Nessun paziente salvato.
                </div>
              ) : null}

              {patients.map((patient) => {
                const active = selectedPatientId === patient.id;
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${active ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-900">
                        {patient.lastName} {patient.firstName}
                      </div>
                      <div className="text-xs text-slate-500">ID {patient.id}</div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                      Seleziona
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/pazienti" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                Gestisci archivio completo
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Crea nuovo paziente</h2>
            <div className="mt-3 grid gap-3">
              <LabeledInput label="Nome" value={firstName} onChange={setFirstName} />
              <LabeledInput label="Cognome" value={lastName} onChange={setLastName} />
            </div>

            <button
              type="button"
              onClick={createPatient}
              className="mt-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Salva e seleziona
            </button>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
              {selectedPatientId ? (
                <>
                  Paziente selezionato. Puoi aprire l'editor adesso.
                  <div className="mt-3">
                    <Link
                      href={`/editor?patientId=${selectedPatientId}&controlDate=${today}&new=1`}
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Apri editor
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  Seleziona o crea prima un paziente. L'editor si aprirà solo dopo questa scelta.
                </>
              )}
            </div>
          </div>
        </section>
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
        className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition shadow-sm focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}
