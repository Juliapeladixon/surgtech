import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PageHeader } from "../components/PageChrome";
import {
  IconArrowRight,
  IconCard,
  IconFolder,
  IconSearch,
} from "../components/Icons";
import { doctorFullName, getSpecialty } from "../lib/catalog";
import { useClinic } from "../lib/useClinic";

export function BrowseHomePage() {
  const { clinic, doctors, cards, base, getDoctor } = useClinic();
  const [query, setQuery] = useState("");

  const specialties = useMemo(() => {
    const ids = [...new Set(doctors.map((d) => d.specialty_id))];
    return ids
      .map((id) => getSpecialty(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [doctors]);

  const q = query.trim().toLowerCase();

  const filteredSpecialties = useMemo(() => {
    if (!q) return specialties;
    return specialties.filter((s) => {
      const docs = doctors.filter((d) => d.specialty_id === s.id);
      const hay = [
        s.name,
        s.short_code,
        ...docs.map((d) => `${d.title} ${d.doctor_name}`),
        ...cards
          .filter((c) => docs.some((d) => d.doctor_id === c.doctorId))
          .map((c) => c.procedureName),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cards, doctors, q, specialties]);

  const recent = [...cards]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  if (!clinic) return <Navigate to="/" replace />;

  return (
    <div>
      <PageHeader
        kicker={clinic.short_name}
        title="Specialties"
        description="Select a specialty at this clinic, then the surgeon, then the procedure card."
        icon={<IconFolder className="h-4 w-4" />}
      />

      <label className="mt-6 block">
        <span className="field-label">Search</span>
        <span className="relative mt-1.5 block">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky" />
          <input
            className="w-full border border-line py-2 pl-10 pr-3 text-sm"
            placeholder="Specialty, surgeon, or procedure"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
      </label>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="field-label">On this file</h2>
            <span className="text-[12px] text-muted">
              {doctors.length} surgeons · {cards.length} cards
            </span>
          </div>
          <ul className="divide-y divide-line border-y border-line bg-paper">
            {filteredSpecialties.map((specialty) => {
              const count = doctors.filter(
                (d) => d.specialty_id === specialty.id,
              ).length;
              const cardCount = cards.filter((c) => {
                const doc = getDoctor(c.doctorId);
                return doc?.specialty_id === specialty.id;
              }).length;
              return (
                <li key={specialty.id}>
                  <Link
                    to={`${base}/browse/${specialty.id}`}
                    className="flex items-center justify-between gap-4 px-3 py-3 hover:bg-linen"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{specialty.name}</p>
                      <p className="text-[12px] text-muted">
                        <span className="font-medium text-teal">
                          {specialty.short_code}
                        </span>
                        {count
                          ? ` · ${count} surgeon${count === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-[12px] tabular-nums text-muted">
                        {cardCount} card{cardCount === 1 ? "" : "s"}
                      </span>
                      <IconArrowRight className="h-4 w-4 text-teal" />
                    </span>
                  </Link>
                </li>
              );
            })}
            {filteredSpecialties.length === 0 && (
              <li className="px-3 py-6 text-sm text-muted">
                No specialties match that search.
              </li>
            )}
          </ul>
        </div>

        <aside>
          <h2 className="field-label mb-2">Recently published</h2>
          <ul className="divide-y divide-line border-y border-line bg-paper">
            {recent.map((card) => {
              const doctor = getDoctor(card.doctorId);
              return (
                <li key={card.id}>
                  <Link
                    to={`${base}/cards/${card.id}`}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-linen"
                  >
                    <IconCard className="h-4 w-4 shrink-0 text-teal" />
                    <span className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{card.procedureName}</p>
                      <p className="text-[12px] text-muted">
                        {doctor ? doctorFullName(doctor) : "Surgeon"}
                        {card.anaesthesiaType ? ` · ${card.anaesthesiaType}` : ""}
                      </p>
                    </span>
                    <IconArrowRight className="h-4 w-4 shrink-0 text-teal" />
                  </Link>
                </li>
              );
            })}
            {recent.length === 0 && (
              <li className="px-3 py-6 text-sm text-muted">
                No cards have been published at this clinic yet.
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
