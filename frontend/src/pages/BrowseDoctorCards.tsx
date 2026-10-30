import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { BackLink, EmptyState, PageHeader, StepTrail } from "../components/PageChrome";
import { IconArrowRight, IconCard } from "../components/Icons";
import { ApiError } from "../lib/api";
import {
  apiDoctorName,
  cardsByContext,
  getDoctor,
  listDoctorProcedures,
  type ApiDoctor,
  type ApiProcedure,
} from "../lib/directoryApi";
import { useClinic } from "../lib/useClinic";

export function BrowseDoctorCardsPage() {
  const { specialtyId, doctorId } = useParams();
  const sid = Number(specialtyId);
  const did = Number(doctorId);
  const { clinic, base } = useClinic();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<ApiDoctor | null>(null);
  const [procedures, setProcedures] = useState<ApiProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(did)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getDoctor(did), listDoctorProcedures(did, true)])
      .then(([doc, procs]) => {
        if (cancelled) return;
        if (Number.isFinite(sid) && doc.specialty !== sid) {
          setError("This doctor is not in the selected specialty.");
          setDoctor(null);
          setProcedures([]);
          return;
        }
        setDoctor(doc);
        setProcedures(procs);
      })
      .catch((err) => {
        if (cancelled) return;
        setDoctor(null);
        setProcedures([]);
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load procedures for this doctor.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [did, sid]);

  const openProcedure = async (procedure: ApiProcedure) => {
    setOpeningId(procedure.id);
    setError(null);
    try {
      const cards = await cardsByContext({
        doctor: did,
        procedure: procedure.id,
        status: "ACTIVE",
      });
      const card = cards[0];
      if (!card) {
        setError(`No active preference card for ${procedure.name}.`);
        return;
      }
      navigate(`${base}/cards/${card.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not open the preference card.",
      );
    } finally {
      setOpeningId(null);
    }
  };

  if (!clinic) return <Navigate to="/" replace />;
  if (!Number.isFinite(did)) return <Navigate to={base} replace />;

  return (
    <div>
      <BackLink
        to={Number.isFinite(sid) ? `${base}/browse/${sid}` : "/"}
      >
        Back to {doctor?.specialty_name ?? "specialty"} doctors
      </BackLink>

      <div className="mt-3">
        <StepTrail
          steps={[
            { label: "Home", to: "/" },
            {
              label: doctor?.specialty_name ?? "Specialty",
              to: Number.isFinite(sid) ? `${base}/browse/${sid}` : undefined,
            },
            {
              label: doctor ? apiDoctorName(doctor) : "Doctor",
              current: true,
            },
          ]}
        />
      </div>

      <div className="mt-5">
        {doctor && (
          <PageHeader
            kicker={doctor.specialty_name}
            title={apiDoctorName(doctor)}
            description={[
              doctor.sub_specialty,
              doctor.practice_or_hospital,
              doctor.city,
              doctor.phone_primary,
            ]
              .filter(Boolean)
              .join(" · ")}
            lead={
              <DoctorAvatar
                doctor={doctor}
                size="lg"
                className="!bg-teal ring-2 ring-white/20"
              />
            }
          />
        )}
      </div>

      <h2 className="field-label mt-8">Procedures with preference cards</h2>
      {error && <p className="mt-3 text-sm text-copper">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading procedures…</p>
      ) : !doctor ? (
        <EmptyState>Doctor not found.</EmptyState>
      ) : procedures.length === 0 ? (
        <EmptyState>
          No preference cards published for this surgeon yet.
        </EmptyState>
      ) : (
        <ul className="mt-2 divide-y divide-line border-y border-line bg-paper">
          {procedures.map((procedure) => (
            <li key={procedure.id}>
              <button
                type="button"
                onClick={() => void openProcedure(procedure)}
                disabled={openingId === procedure.id}
                className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-linen disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center bg-teal text-white">
                  <IconCard className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{procedure.name}</p>
                  <p className="text-[13px] text-muted">
                    {procedure.aliases
                      ? procedure.aliases
                      : "Open preference card"}
                  </p>
                </span>
                <span className="text-[12px] text-muted">
                  {openingId === procedure.id ? "Opening…" : "View card"}
                </span>
                <IconArrowRight className="h-4 w-4 text-teal" />
              </button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
