"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatItalianDate } from "../lib/date";

type Patient = {
	id: number;
	firstName: string;
	lastName: string;
};

type ControlRecord = {
	controlDate: string;
	weekTitle: string;
};

type EditingPatientState = {
	id: number;
	firstName: string;
	lastName: string;
} | null;

export default function PazientiPage() {
	const [patients, setPatients] = useState<Patient[]>([]);
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	const [controlRecordsByPatient, setControlRecordsByPatient] = useState<Record<number, ControlRecord[]>>({});
	const [openPatientIds, setOpenPatientIds] = useState<number[]>([]);
	const [editingPatient, setEditingPatient] = useState<EditingPatientState>(null);

	const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
	const [patientSearch, setPatientSearch] = useState("");
	const filteredPatients = useMemo(() => {
		const query = patientSearch.trim().toLowerCase();
		if (!query) {
			return patients;
		}

		return patients.filter((patient) => {
			const fullName = `${patient.lastName} ${patient.firstName}`.toLowerCase();
			return fullName.includes(query)
				|| patient.firstName.toLowerCase().includes(query)
				|| patient.lastName.toLowerCase().includes(query)
				|| String(patient.id).includes(query);
		});
	}, [patientSearch, patients]);

	const showStatus = (message: string) => {
		setStatus(message);
		setTimeout(() => setStatus(null), 2200);
	};

	const loadPatients = async () => {
		const res = await fetch("/api/patients", { cache: "no-store" });
		if (!res.ok) {
			throw new Error("Failed to load patients");
		}

		const data = (await res.json()) as { patients: Patient[] };
		setPatients(data.patients);
	};

	const loadHistoryForPatient = async (patientId: number) => {
		const res = await fetch(`/api/diets?patientId=${patientId}`, { cache: "no-store" });
		if (!res.ok) {
			throw new Error("Failed to load patient history");
		}

		const data = (await res.json()) as { controlRecords: ControlRecord[] };
		setControlRecordsByPatient((current) => ({
			...current,
			[patientId]: data.controlRecords,
		}));
	};

	const toggleHistory = async (patientId: number) => {
		if (openPatientIds.includes(patientId)) {
			setOpenPatientIds((current) => current.filter((id) => id !== patientId));
			return;
		}

		setOpenPatientIds((current) => [...current, patientId]);
		if (!controlRecordsByPatient[patientId]) {
			try {
				await loadHistoryForPatient(patientId);
			} catch (error) {
				console.error(error);
				showStatus("Errore caricamento storico");
			}
		}
	};

	const createPatient = async () => {
		const fn = firstName.trim();
		const ln = lastName.trim();

		if (!fn || !ln) {
			showStatus("Inserisci nome e cognome");
			return;
		}

		try {
			const res = await fetch("/api/patients", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ firstName: fn, lastName: ln }),
			});

			if (!res.ok) {
				throw new Error("Failed to create patient");
			}

			setFirstName("");
			setLastName("");
			await loadPatients();
			showStatus("Paziente creato");
		} catch (error) {
			console.error(error);
			showStatus("Errore creazione paziente");
		}
	};

	const startEditPatient = (patient: Patient) => {
		setEditingPatient({ ...patient });
	};

	const savePatientEdit = async () => {
		if (!editingPatient) {
			return;
		}

		const first = editingPatient.firstName.trim();
		const last = editingPatient.lastName.trim();
		if (!first || !last) {
			showStatus("Nome e cognome sono obbligatori");
			return;
		}

		try {
			const res = await fetch("/api/patients", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					patientId: editingPatient.id,
					firstName: first,
					lastName: last,
				}),
			});

			if (!res.ok) {
				throw new Error("Failed to update patient");
			}

			setEditingPatient(null);
			await loadPatients();
			showStatus("Paziente aggiornato");
		} catch (error) {
			console.error(error);
			showStatus("Errore aggiornamento paziente");
		}
	};

	const deletePatientRecord = async (patientId: number) => {
		const confirmed = window.confirm("Eliminare questo paziente e tutte le sue diete?");
		if (!confirmed) {
			return;
		}

		try {
			const res = await fetch(`/api/patients?patientId=${patientId}`, { method: "DELETE" });
			if (!res.ok) {
				throw new Error("Failed to delete patient");
			}

			setPatients((current) => current.filter((patient) => patient.id !== patientId));
			setControlRecordsByPatient((current) => {
				const next = { ...current };
				delete next[patientId];
				return next;
			});
			setOpenPatientIds((current) => current.filter((id) => id !== patientId));
			if (editingPatient?.id === patientId) {
				setEditingPatient(null);
			}
			showStatus("Paziente eliminato");
		} catch (error) {
			console.error(error);
			showStatus("Errore eliminazione paziente");
		}
	};

	const deleteDietRecord = async (patientId: number, controlDate: string, weekTitle: string) => {
		const confirmed = window.confirm(`Eliminare la dieta del ${formatItalianDate(controlDate)} - ${weekTitle}?`);
		if (!confirmed) {
			return;
		}

		try {
			const params = new URLSearchParams({
				patientId: String(patientId),
				controlDate,
				weekTitle,
			});
			const res = await fetch(`/api/diets?${params.toString()}`, { method: "DELETE" });
			if (!res.ok) {
				throw new Error("Failed to delete diet");
			}

			await loadHistoryForPatient(patientId);
			showStatus("Dieta eliminata");
		} catch (error) {
			console.error(error);
			showStatus("Errore eliminazione dieta");
		}
	};

	useEffect(() => {
		void loadPatients().catch((error) => {
			console.error(error);
			showStatus("Errore caricamento pazienti");
		});
	}, []);

	return (
		<main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8">
			{status ? (
				<div className="fixed right-4 top-4 z-50 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
					{status}
				</div>
			) : null}

			<div className="mx-auto max-w-[1200px] rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/60 backdrop-blur">
				<header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
					<div>
						<div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 ring-1 ring-indigo-100">
							Archivio pazienti
						</div>
						<h1 className="text-3xl font-semibold tracking-tight text-slate-900">Gestione pazienti</h1>
						<p className="mt-2 text-sm text-slate-500">Per ogni paziente puoi aprire una nuova dieta, modificare l'anagrafica o gestire lo storico per data controllo.</p>
					</div>
					{/* Pulsante rimosso: Torna all'editor (inutile) */}
				</header>

				<section className="mb-6 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 p-5 shadow-sm ring-1 ring-slate-100">
					<h2 className="text-lg font-semibold text-slate-900">Nuovo paziente</h2>
					<div className="mt-3 grid gap-3 sm:grid-cols-2">
						<LabeledInput label="Nome" value={firstName} onChange={setFirstName} />
						<LabeledInput label="Cognome" value={lastName} onChange={setLastName} />
					</div>
					<button
						type="button"
						onClick={createPatient}
						className="mt-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
					>
						Salva paziente
					</button>
				</section>

				<section className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm ring-1 ring-slate-100">
					<h2 className="text-lg font-semibold text-slate-900">Cerca paziente</h2>
					<p className="mt-1 text-sm text-slate-500">Filtra l'archivio per nome, cognome.</p>
					<div className="mt-3 max-w-xl">
						<LabeledInput label="Ricerca" value={patientSearch} onChange={setPatientSearch} placeholder="Nome, cognome" />
					</div>
				</section>

				<section className="space-y-3">
					{patients.length === 0 ? (
						<div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Nessun paziente salvato.</div>
					) : null}

					{patients.length > 0 && filteredPatients.length === 0 ? (
						<div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Nessun paziente corrispondente alla ricerca.</div>
					) : null}

					{filteredPatients.map((patient) => {
						const isOpen = openPatientIds.includes(patient.id);
						const records = controlRecordsByPatient[patient.id] ?? [];
						const isEditing = editingPatient?.id === patient.id;

						return (
							<article key={patient.id} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm ring-1 ring-slate-100">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										{isEditing ? (
											<div className="grid gap-3 sm:grid-cols-2">
												<LabeledInput
													label="Nome"
													value={editingPatient.firstName}
													onChange={(value) => setEditingPatient({ ...editingPatient, firstName: value })}
												/>
												<LabeledInput
													label="Cognome"
													value={editingPatient.lastName}
													onChange={(value) => setEditingPatient({ ...editingPatient, lastName: value })}
												/>
											</div>
										) : (
											<>
												<h3 className="text-base font-semibold uppercase tracking-[0.08em] text-slate-900">
													{patient.lastName} {patient.firstName}
												</h3>
											</>
										)}
									</div>

									<div className="flex flex-wrap gap-2">
										<Link
											href={`/editor?patientId=${patient.id}&controlDate=${today}&new=1`}
											className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
										>
											Nuova dieta
										</Link>
										{isEditing ? (
											<>
												<button
													type="button"
													onClick={savePatientEdit}
													className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
												>
													Salva
												</button>
												<button
													type="button"
													onClick={() => setEditingPatient(null)}
													className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
												>
													Annulla
												</button>
											</>
										) : (
											<>
												<button
													type="button"
													onClick={() => void toggleHistory(patient.id)}
													className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
												>
													{isOpen ? "Nascondi storico" : "Vedi storico"}
												</button>
												<button
													type="button"
													onClick={() => startEditPatient(patient)}
													className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-700 shadow-sm hover:bg-amber-100"
												>
													Modifica
												</button>
												<button
													type="button"
													onClick={() => void deletePatientRecord(patient.id)}
													className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
												>
													Elimina
												</button>
											</>
										)}
									</div>
								</div>

								{isOpen && !isEditing ? (
									<div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
										{records.length === 0 ? (
											<p className="text-sm text-slate-500">Nessuna dieta salvata per questo paziente.</p>
										) : (
											<div className="space-y-2">
												{records.map((record) => {
													const displayDate = formatItalianDate(record.controlDate);
													return (
														<div key={`${record.controlDate}-${record.weekTitle}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
															<div className="text-sm font-medium text-slate-700">
																{displayDate} - {record.weekTitle}
															</div>
															<div className="flex flex-wrap gap-2">
																<Link
																	href={`/editor?patientId=${patient.id}&controlDate=${record.controlDate}&weekTitle=${encodeURIComponent(record.weekTitle)}`}
																	className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-sky-800 hover:bg-sky-200"
																>
																	Apri
																</Link>
																<Link
																	href={`/editor?patientId=${patient.id}&controlDate=${record.controlDate}&weekTitle=${encodeURIComponent(record.weekTitle)}`}
																	className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-700 hover:bg-indigo-100"
																>
																	Modifica
																</Link>
																<button
																	type="button"
																	onClick={() => void deleteDietRecord(patient.id, record.controlDate, record.weekTitle)}
																	className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-rose-700 hover:bg-rose-100"
																>
																	Elimina
																</button>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>
								) : null}
							</article>
						);
					})}
				</section>
			</div>
		</main>
	);
}

function LabeledInput({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	return (
		<label className="block">
			<span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
			<input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 outline-none transition shadow-sm placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
			/>
		</label>
	);
}
