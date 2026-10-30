import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CardPreview } from "../components/CardPreview";
import { IconCard } from "../components/Icons";
import { BackLink, PageHeader } from "../components/PageChrome";
import {
  nextSourceRoute,
  useCardBuilder,
} from "../context/CardBuilderContext";
import { useStaff } from "../context/AuthContext";
import { useDirectory } from "../context/DirectoryContext";
import {
  doctorFullName,
  getSpecialty,
  matchProcedure,
  SOURCE_LABELS,
  SOURCE_ORDER,
  DEMO_CLINIC_SLUG,
  staffPath,
} from "../lib/catalog";
import type { DoctorContext } from "../types";

const positions = ["Supine", "Prone", "Lateral", "Lithotomy", "Sitting"];
const anaesthesia = [
  "GA",
  "Spinal",
  "Epidural",
  "Local",
  "Sedation",
  "Regional",
  "Other",
];

export function useDraftDoctorCtx(): DoctorContext | null {
  const { draft } = useCardBuilder();
  const { getDoctor, getSurgeonByDoctor } = useDirectory();
  if (!draft.doctorId) return null;
  const doctor = getDoctor(draft.doctorId);
  const surgeon = getSurgeonByDoctor(draft.doctorId);
  const specialty = doctor ? getSpecialty(doctor.specialty_id) : undefined;
  if (!doctor || !surgeon || !specialty) return null;
  return { doctor, surgeon, specialty };
}

export function PreferenceCardSetupPage() {
  const { draft, updateDraft, toggleSource, resetDraft } = useCardBuilder();
  const staff = useStaff();
  const { doctorsForClinic } = useDirectory();
  const doctors = doctorsForClinic(staff.clinicSlug ?? DEMO_CLINIC_SLUG);
  const doctorCtx = useDraftDoctorCtx();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const specialtyId = doctorCtx?.specialty.id;

  const suggestions = useMemo(
    () => matchProcedure(draft.procedureName, specialtyId).slice(0, 6),
    [draft.procedureName, specialtyId],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.doctorId) {
      setError("Select the doctor this card belongs to.");
      return;
    }
    if (!draft.procedureName.trim()) {
      setError("Enter the procedure this card is for.");
      return;
    }
    if (draft.selectedSources.length === 0) {
      setError("Tick at least one list: sutures, instruments or packs.");
      return;
    }
    navigate(nextSourceRoute(draft.selectedSources));
  };

  return (
    <>
      <BackLink to={staffPath()} className="mb-4">
        Back to overview
      </BackLink>
      <WizardShell title="New preference card" step="1 · Doctor & procedure">
      <form onSubmit={onSubmit} className="space-y-6">
        <label className="block text-sm">
          Doctor
          <select
            className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2"
            value={draft.doctorId ?? ""}
            onChange={(e) =>
              updateDraft({
                doctorId: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Select doctor…</option>
            {doctors.map((doctor) => (
              <option key={doctor.doctor_id} value={doctor.doctor_id}>
                {doctorFullName(doctor)} ·{" "}
                {getSpecialty(doctor.specialty_id)?.short_code}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Procedure</span>
          <input
            className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2"
            placeholder="e.g. Tonsillectomy or VV strip"
            value={draft.procedureName}
            onChange={(e) => {
              const procedureName = e.target.value;
              const match = matchProcedure(procedureName, specialtyId)[0];
              const exact =
                match &&
                match.name.toLowerCase() === procedureName.trim().toLowerCase()
                  ? match
                  : null;
              updateDraft({
                procedureName,
                procedureId: exact?.id ?? null,
              });
              setError(null);
            }}
          />
        </label>

        {suggestions.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((procedure) => (
              <li key={procedure.id}>
                <button
                  type="button"
                  className="rounded-full border border-line px-3 py-1 text-xs hover:border-teal hover:text-teal"
                  onClick={() =>
                    updateDraft({
                      procedureName: procedure.name,
                      procedureId: procedure.id,
                    })
                  }
                >
                  {procedure.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Patient position
            <select
              className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2"
              value={draft.patientPosition}
              onChange={(e) => updateDraft({ patientPosition: e.target.value })}
            >
              <option value="">Select…</option>
              {positions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Anaesthesia
            <select
              className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2"
              value={draft.anaesthesiaType}
              onChange={(e) => updateDraft({ anaesthesiaType: e.target.value })}
            >
              <option value="">Select…</option>
              {anaesthesia.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          Starred note
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-md border border-line bg-paper px-3 py-2"
            placeholder="Always prepare for bronchoscope"
            value={draft.notes}
            onChange={(e) => updateDraft({ notes: e.target.value })}
          />
        </label>

        <fieldset className="rounded-sm border border-line bg-paper p-4">
          <legend className="px-1 text-sm font-medium">
            What should appear on this card?
          </legend>
          <p className="mb-3 text-sm text-muted">
            Tick the lists you want. Each selected list opens on its own page.
          </p>
          <div className="space-y-2">
            {SOURCE_ORDER.map((source) => (
              <label key={source} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.selectedSources.includes(source)}
                  onChange={() => toggleSource(source)}
                />
                <span>{SOURCE_LABELS[source]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-copper">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-md bg-scrub px-4 py-2 text-sm text-white hover:bg-scrub-deep"
          >
            Continue
          </button>
          <button
            type="button"
            className="rounded-md border border-line px-4 py-2 text-sm"
            onClick={resetDraft}
          >
            Start again
          </button>
        </div>
      </form>
      </WizardShell>
    </>
  );
}

export function WizardShell({
  title,
  step,
  children,
}: {
  title: string;
  step: string;
  children: ReactNode;
}) {
  const { draft } = useCardBuilder();
  const doctorCtx = useDraftDoctorCtx();

  return (
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.95fr]">
      <div>
        <PageHeader
          kicker={step}
          title={title}
          icon={<IconCard className="h-4 w-4" />}
        />
        <div className="mt-6">{children}</div>
      </div>
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <p className="field-label mb-3">Preview</p>
        {doctorCtx ? (
          <CardPreview card={draft} doctorCtx={doctorCtx} />
        ) : (
          <div className="border border-dashed border-line bg-paper px-5 py-8 text-sm text-muted">
            Select a surgeon to preview the card.
          </div>
        )}
      </aside>
    </div>
  );
}
