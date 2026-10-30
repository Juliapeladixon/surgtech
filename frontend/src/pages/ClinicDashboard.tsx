import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { PageHeader } from "../components/PageChrome";
import {
  IconArrowRight,
  IconFolder,
  IconHospital,
  IconProfile,
  IconSearch,
} from "../components/Icons";
import { ApiError } from "../lib/api";
import {
  apiDoctorName,
  listProcedureCards,
  listSpecialties,
  listSpecialtyDoctors,
  searchDoctors,
  searchProcedures,
  type ApiDoctor,
  type ApiProcedure,
  type ApiSpecialty,
} from "../lib/directoryApi";
import { useClinic } from "../lib/useClinic";

export function ClinicDashboardPage() {
  const { clinic, base } = useClinic();
  const navigate = useNavigate();

  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);
  const [query, setQuery] = useState("");
  const [doctorHits, setDoctorHits] = useState<
    {
      specialtyId: number;
      specialtyName: string;
      doctorId: number;
      label: string;
      detail: string;
    }[]
  >([]);
  const [procedureHits, setProcedureHits] = useState<ApiProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [openingProcedureId, setOpeningProcedureId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [openSpecialtyId, setOpenSpecialtyId] = useState<number | null>(null);
  const [doctorsBySpecialty, setDoctorsBySpecialty] = useState<
    Record<number, ApiDoctor[]>
  >({});
  const [loadingDoctorsId, setLoadingDoctorsId] = useState<number | null>(null);
  const [doctorErrorById, setDoctorErrorById] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listSpecialties()
      .then((specs) => {
        if (!cancelled) setSpecialties(specs);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load specialties.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setDoctorHits([]);
      setProcedureHits([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      Promise.all([searchDoctors(q), searchProcedures(q)])
        .then(([doctors, procedures]) => {
          if (cancelled) return;
          setDoctorHits(
            doctors.slice(0, 8).map((doctor) => ({
              specialtyId: doctor.specialty,
              specialtyName: doctor.specialty_name,
              doctorId: doctor.doctor_id,
              label: apiDoctorName(doctor),
              detail: [
                doctor.sub_specialty || doctor.specialty_name,
                doctor.practice_or_hospital,
                doctor.city,
              ]
                .filter(Boolean)
                .join(" · "),
            })),
          );
          setProcedureHits(procedures.slice(0, 8));
        })
        .catch((err) => {
          if (cancelled) return;
          setDoctorHits([]);
          setProcedureHits([]);
          setSearchError(
            err instanceof ApiError ? err.message : "Search failed.",
          );
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  if (!clinic) return <Navigate to="/" replace />;

  const showSearch = query.trim().length >= 2;

  const specialtyHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return specialties
      .filter((specialty) =>
        [specialty.name, specialty.short_code]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 8);
  }, [specialties, query]);

  const openProcedureCards = async (procedure: ApiProcedure) => {
    setOpeningProcedureId(procedure.id);
    setSearchError(null);
    try {
      const cards = await listProcedureCards(procedure.id, "ACTIVE");
      if (cards.length === 0) {
        setSearchError(`No active preference card for ${procedure.name}.`);
        return;
      }
      if (cards.length === 1) {
        navigate(`${base}/cards/${cards[0].id}`);
        return;
      }
      const first = cards[0];
      const specialtyId =
        first.procedure.specialty?.id ?? procedure.specialty;
      const doctorId = first.doctor.doctor_id;
      navigate(`${base}/browse/${specialtyId}/${doctorId}`);
    } catch (err) {
      setSearchError(
        err instanceof ApiError
          ? err.message
          : "Could not open cards for that procedure.",
      );
    } finally {
      setOpeningProcedureId(null);
    }
  };

  const toggleSpecialty = async (specialtyId: number) => {
    if (openSpecialtyId === specialtyId) {
      setOpenSpecialtyId(null);
      return;
    }
    setOpenSpecialtyId(specialtyId);
    if (doctorsBySpecialty[specialtyId]) return;

    setLoadingDoctorsId(specialtyId);
    setDoctorErrorById((prev) => {
      const next = { ...prev };
      delete next[specialtyId];
      return next;
    });
    try {
      const doctors = await listSpecialtyDoctors(specialtyId);
      setDoctorsBySpecialty((prev) => ({ ...prev, [specialtyId]: doctors }));
    } catch (err) {
      setDoctorErrorById((prev) => ({
        ...prev,
        [specialtyId]:
          err instanceof ApiError
            ? err.message
            : "Could not load doctors for this specialty.",
      }));
    } finally {
      setLoadingDoctorsId(null);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Home"
        title="Specialties"
        description="Browse specialty → doctor → procedure. Open a specialty to see its doctors."
        icon={<IconHospital className="h-4 w-4" />}
      />

      {error && <p className="mt-4 text-sm text-copper">{error}</p>}

      <section className="mt-6">
        <label className="mb-5 block">
          <span className="field-label">Search specialty, doctor, or procedure</span>
          <span className="relative mt-1.5 block">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky" />
            <input
              className="w-full border border-line py-2 pl-10 pr-3 text-sm"
              placeholder="e.g. ENT, Chidziva, tonsillectomy"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </span>
        </label>

        {searchError && (
          <p className="mb-4 text-sm text-copper">{searchError}</p>
        )}

        {showSearch ? (
          <div className="space-y-6">
            {searching ? (
              <p className="text-sm text-muted">Searching…</p>
            ) : (
              <>
                <div>
                  <h2 className="field-label mb-2">Matching specialties</h2>
                  {specialtyHits.length === 0 ? (
                    <p className="text-sm text-muted">
                      No specialties match “{query.trim()}”.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line border-y border-line bg-paper">
                      {specialtyHits.map((specialty) => (
                        <li key={specialty.id}>
                          <Link
                            to={`${base}/browse/${specialty.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-linen"
                          >
                            <span className="inline-flex h-8 w-8 items-center justify-center bg-sky text-white">
                              <IconFolder className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {specialty.name}
                              </p>
                              <p className="text-[12px] text-muted">
                                <span className="font-medium text-teal">
                                  {specialty.short_code}
                                </span>
                                {" · Open doctors"}
                              </p>
                            </span>
                            <IconArrowRight className="h-4 w-4 text-teal" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h2 className="field-label mb-2">Matching doctors</h2>
                  {doctorHits.length === 0 ? (
                    <p className="text-sm text-muted">
                      No doctors match “{query.trim()}”.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line border-y border-line bg-paper">
                      {doctorHits.map((hit) => (
                        <li key={`${hit.specialtyId}-${hit.doctorId}`}>
                          <Link
                            to={`${base}/browse/${hit.specialtyId}/${hit.doctorId}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-linen"
                          >
                            <span className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{hit.label}</p>
                              <p className="text-[12px] text-muted">
                                {hit.specialtyName}
                                {hit.detail ? ` · ${hit.detail}` : ""}
                              </p>
                            </span>
                            <IconArrowRight className="h-4 w-4 text-teal" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h2 className="field-label mb-2">Matching procedures</h2>
                  {procedureHits.length === 0 ? (
                    <p className="text-sm text-muted">
                      No procedures match “{query.trim()}”.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line border-y border-line bg-paper">
                      {procedureHits.map((procedure) => (
                        <li key={procedure.id}>
                          <button
                            type="button"
                            onClick={() => void openProcedureCards(procedure)}
                            disabled={openingProcedureId === procedure.id}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-linen disabled:opacity-60"
                          >
                            <span className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {procedure.name}
                              </p>
                              <p className="text-[12px] text-muted">
                                {procedure.specialty_name}
                                {procedure.aliases
                                  ? ` · ${procedure.aliases}`
                                  : ""}
                              </p>
                            </span>
                            <span className="text-[12px] text-muted">
                              {openingProcedureId === procedure.id
                                ? "Opening…"
                                : "Open"}
                            </span>
                            <IconArrowRight className="h-4 w-4 text-teal" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="field-label">All specialties</h2>
              <span className="text-[12px] text-muted">
                {specialties.length} specialties
              </span>
            </div>
            {loading ? (
              <p className="text-sm text-muted">Loading specialties…</p>
            ) : specialties.length === 0 ? (
              <p className="text-sm text-muted">No specialties listed yet.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line bg-paper">
                {specialties.map((specialty) => {
                  const open = openSpecialtyId === specialty.id;
                  const doctors = doctorsBySpecialty[specialty.id];
                  const doctorError = doctorErrorById[specialty.id];
                  const loadingDoctors = loadingDoctorsId === specialty.id;

                  return (
                    <li key={specialty.id}>
                      <button
                        type="button"
                        onClick={() => void toggleSpecialty(specialty.id)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-linen"
                        aria-expanded={open}
                      >
                        <span className="inline-flex h-8 w-8 items-center justify-center bg-sky text-white">
                          <IconFolder className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{specialty.name}</p>
                          <p className="text-[12px] text-muted">
                            <span className="font-medium text-teal">
                              {specialty.short_code}
                            </span>
                            {open ? " · Hide doctors" : " · Show doctors"}
                          </p>
                        </span>
                        <span
                          className={`text-teal transition-transform ${
                            open ? "rotate-90" : ""
                          }`}
                        >
                          <IconArrowRight className="h-4 w-4" />
                        </span>
                      </button>

                      {open && (
                        <div className="border-t border-line bg-linen/60 px-4 py-3">
                          {loadingDoctors ? (
                            <p className="text-sm text-muted">Loading doctors…</p>
                          ) : doctorError ? (
                            <p className="text-sm text-copper">{doctorError}</p>
                          ) : !doctors || doctors.length === 0 ? (
                            <p className="text-sm text-muted">
                              No surgeons listed under this specialty yet.
                            </p>
                          ) : (
                            <ul className="divide-y divide-line border border-line bg-paper">
                              {doctors.map((doctor) => (
                                <li key={doctor.doctor_id}>
                                  <Link
                                    to={`${base}/browse/${specialty.id}/${doctor.doctor_id}`}
                                    className="flex items-center gap-3 px-3 py-3 hover:bg-linen"
                                  >
                                    <DoctorAvatar
                                      doctor={doctor}
                                      size="sm"
                                      className="!bg-teal"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <p className="text-sm font-medium">
                                        {apiDoctorName(doctor)}
                                      </p>
                                      <p className="truncate text-[12px] text-muted">
                                        {doctor.sub_specialty || specialty.name}
                                        {doctor.practice_or_hospital
                                          ? ` · ${doctor.practice_or_hospital}`
                                          : ""}
                                      </p>
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
                                      Procedures
                                      <IconArrowRight className="h-3.5 w-3.5 text-teal" />
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-3 text-[13px]">
                            <Link
                              to={`${base}/browse/${specialty.id}`}
                              className="inline-flex items-center gap-1.5 text-sky hover:text-ink"
                            >
                              <IconProfile className="h-3.5 w-3.5" />
                              Open full {specialty.name} list
                            </Link>
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
