import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { PageHeader } from "../components/PageChrome";
import { IconArrowRight, IconProfile, IconSearch } from "../components/Icons";
import { doctorFullName, getSpecialty } from "../lib/catalog";
import { useClinic } from "../lib/useClinic";

export function ClinicSurgeonsPage() {
  const { clinic, doctors, base, cardsForDoctor } = useClinic();
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((doctor) => {
      const specialty = getSpecialty(doctor.specialty_id);
      return [doctor.title, doctor.doctor_name, doctor.sub_specialty, specialty?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [doctors, query]);

  if (!clinic) return <Navigate to="/" replace />;

  return (
    <div>
      <PageHeader
        kicker={clinic.short_name}
        title="Surgeons"
        description="Everyone on this clinic file. Open a surgeon to see their preference cards."
        icon={<IconProfile className="h-4 w-4" />}
      />

      <div className="border-x border-line bg-paper px-5 py-4">
        <label className="relative block">
          <span className="sr-only">Search surgeons</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky" />
          <input
            className="w-full border border-line py-2 pl-10 pr-3 text-sm"
            placeholder="Search surgeon or specialty"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {doctors.length === 0 ? (
        <p className="border-x border-b border-line px-5 py-8 text-sm text-muted">
          No surgeons listed at this clinic yet.
        </p>
      ) : list.length === 0 ? (
        <p className="border-x border-b border-line px-5 py-8 text-sm text-muted">
          No surgeons match “{query.trim()}”.
        </p>
      ) : (
        <ul className="divide-y divide-line border-x border-b border-line bg-paper">
          {list.map((doctor) => {
            const specialty = getSpecialty(doctor.specialty_id);
            const cardCount = cardsForDoctor(doctor.doctor_id).length;
            return (
              <li key={doctor.doctor_id}>
                <Link
                  to={`${base}/browse/${doctor.specialty_id}/${doctor.doctor_id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-linen"
                >
                  <DoctorAvatar doctor={doctor} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{doctorFullName(doctor)}</p>
                    <p className="truncate text-[13px] text-muted">
                      {specialty?.name ?? "Specialty"}
                      {doctor.sub_specialty ? ` · ${doctor.sub_specialty}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] tabular-nums text-muted">
                    {cardCount} card{cardCount === 1 ? "" : "s"}
                  </span>
                  <IconArrowRight className="h-4 w-4 shrink-0 text-teal" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
