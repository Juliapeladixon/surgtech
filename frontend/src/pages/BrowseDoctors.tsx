import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { BackLink, PageHeader, StepTrail } from "../components/PageChrome";
import { IconArrowRight, IconProfile, IconSearch } from "../components/Icons";
import { ApiError } from "../lib/api";
import {
  apiDoctorName,
  getSpecialty,
  listSpecialtyDoctors,
  type ApiDoctor,
  type ApiSpecialty,
} from "../lib/directoryApi";
import { useClinic } from "../lib/useClinic";

export function BrowseDoctorsPage() {
  const { specialtyId } = useParams();
  const id = Number(specialtyId);
  const { clinic, base } = useClinic();
  const [specialty, setSpecialty] = useState<ApiSpecialty | null>(null);
  const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getSpecialty(id), listSpecialtyDoctors(id)])
      .then(([spec, docs]) => {
        if (cancelled) return;
        setSpecialty(spec);
        setDoctors(docs);
      })
      .catch((err) => {
        if (cancelled) return;
        setSpecialty(null);
        setDoctors([]);
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load doctors for this specialty.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((doctor) =>
      [
        doctor.title,
        doctor.doctor_name,
        doctor.sub_specialty,
        doctor.practice_or_hospital,
        doctor.city,
        doctor.phone_primary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [doctors, query]);

  if (!clinic) return <Navigate to="/" replace />;
  if (!Number.isFinite(id)) return <Navigate to={base} replace />;

  return (
    <div>
      <BackLink to="/">Back to home</BackLink>

      <div className="mt-3">
        <StepTrail
          steps={[
            { label: "Home", to: "/" },
            {
              label: specialty?.name ?? "Specialty",
              current: true,
            },
            { label: "Doctor" },
          ]}
        />
      </div>

      <div className="mt-5">
        <PageHeader
          kicker={specialty?.short_code ?? "Specialty"}
          title={specialty?.name ?? "Doctors"}
          description="Search for a doctor in this specialty, then open their procedures and preference cards."
          icon={<IconProfile className="h-4 w-4" />}
        />

        <div className="border-x border-line bg-paper px-5 py-4">
          <label className="relative block">
            <span className="sr-only">Search doctors</span>
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky" />
            <input
              className="w-full border border-line py-2 pl-10 pr-3 text-sm"
              placeholder="Search doctor name, hospital, or city"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <p className="border-x border-b border-line px-5 py-4 text-sm text-copper">
            {error}
          </p>
        )}

        {loading ? (
          <p className="border-x border-b border-line px-5 py-8 text-sm text-muted">
            Loading doctors…
          </p>
        ) : doctors.length === 0 ? (
          <p className="border-x border-b border-line px-5 py-8 text-sm text-muted">
            No surgeons listed under this specialty yet.
          </p>
        ) : list.length === 0 ? (
          <p className="border-x border-b border-line px-5 py-8 text-sm text-muted">
            No doctors match “{query.trim()}”.
          </p>
        ) : (
          <ul className="divide-y divide-line border-x border-b border-line bg-paper">
            {list.map((doctor) => (
              <li key={doctor.doctor_id}>
                <Link
                  to={`${base}/browse/${id}/${doctor.doctor_id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-linen"
                >
                  <DoctorAvatar doctor={doctor} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {apiDoctorName(doctor)}
                    </p>
                    <p className="truncate text-[13px] text-muted">
                      {doctor.sub_specialty || specialty?.name}
                      {doctor.practice_or_hospital
                        ? ` · ${doctor.practice_or_hospital}`
                        : ""}
                      {doctor.city ? ` · ${doctor.city}` : ""}
                    </p>
                  </div>
                  <IconArrowRight className="h-4 w-4 shrink-0 text-teal" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
