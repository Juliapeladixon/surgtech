import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageChrome";
import {
  IconArrowRight,
  IconHospital,
  IconSearch,
} from "../components/Icons";
import { useDirectory } from "../context/DirectoryContext";
import { clinicHome } from "../lib/catalog";

export function ClinicPickerPage() {
  const { clinics, doctorsForClinic, cardsForClinic } = useDirectory();
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter((clinic) =>
      [clinic.name, clinic.short_name, clinic.city, clinic.slug]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [clinics, query]);

  return (
    <div>
      <PageHeader
        kicker="SurgTech OR"
        title="Open a clinic file"
        description="Each hospital has its own preference-card dashboard. Open the clinic you are working in, then browse specialties and surgeons at that site."
        icon={<IconHospital className="h-4 w-4" />}
      />

      <label className="mt-6 block">
        <span className="field-label">Find a clinic</span>
        <span className="relative mt-1.5 block">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky" />
          <input
            className="w-full border border-line py-2 pl-10 pr-3 text-sm"
            placeholder="Hospital name or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
      </label>

      <ul className="mt-6 divide-y divide-line border-y border-line bg-paper">
        {list.map((clinic) => {
          const doctors = doctorsForClinic(clinic.slug);
          const cards = cardsForClinic(clinic.slug);
          return (
            <li key={clinic.slug}>
              <Link
                to={clinicHome(clinic.slug)}
                className="flex items-center gap-4 px-4 py-4 hover:bg-linen"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-teal text-white">
                  <IconHospital className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{clinic.name}</p>
                  <p className="text-[13px] text-muted">
                    {clinic.city}
                    {clinic.address ? ` · ${clinic.address}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[12px] text-sky">
                    /c/{clinic.slug}
                  </p>
                </div>
                <span className="hidden text-[12px] tabular-nums text-muted sm:block">
                  {doctors.length} surgeons · {cards.length} cards
                </span>
                <IconArrowRight className="h-4 w-4 shrink-0 text-teal" />
              </Link>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="px-4 py-8 text-sm text-muted">
            No clinic matches that search.
          </li>
        )}
      </ul>
    </div>
  );
}
