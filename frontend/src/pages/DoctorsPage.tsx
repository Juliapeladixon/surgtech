import { FormEvent, useMemo, useState } from "react";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { IconPlus, IconProfile, IconSearch } from "../components/Icons";
import { BackLink, PageHeader } from "../components/PageChrome";
import { useStaff } from "../context/AuthContext";
import { useDirectory } from "../context/DirectoryContext";
import {
  DEMO_CLINIC_SLUG,
  doctorFullName,
  specialtyList,
  staffPath,
} from "../lib/catalog";

export function DoctorsPage() {
  const staff = useStaff();
  const { getClinic, doctorsForClinic, addDoctor, getSurgeonByDoctor } =
    useDirectory();
  const localSlug = staff.clinicSlug ?? DEMO_CLINIC_SLUG;
  const clinic = getClinic(localSlug);
  const doctors = doctorsForClinic(localSlug);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((doctor) => {
      const specialty =
        specialtyList.find((s) => s.id === doctor.specialty_id)?.name ?? "";
      const haystack = [
        doctorFullName(doctor),
        doctor.doctor_name,
        doctor.practice_or_hospital,
        doctor.city,
        doctor.sub_specialty,
        specialty,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [doctors, query]);
  const [form, setForm] = useState({
    title: "Dr",
    doctor_name: "",
    specialty_id: String(specialtyList[0]?.id ?? 1),
    sub_specialty: "",
    practice_or_hospital: clinic?.name ?? "",
    address: clinic?.address ?? "",
    city: clinic?.city ?? "",
    phone_primary: clinic?.phone ?? "",
    phone_secondary: "",
    notes: "",
    display_name: "",
    glove_size: "7",
    general_notes: "",
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.doctor_name.trim() || !form.practice_or_hospital.trim()) {
      setError("Name and practice / hospital are required.");
      return;
    }
    addDoctor({
      doctor: {
        title: form.title,
        doctor_name: form.doctor_name.trim(),
        specialty_id: Number(form.specialty_id),
        sub_specialty: form.sub_specialty.trim(),
        practice_or_hospital: form.practice_or_hospital.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        phone_primary: form.phone_primary.trim(),
        phone_secondary: form.phone_secondary.trim(),
        is_group_practice: false,
        notes: form.notes.trim(),
      },
      surgeon: {
        display_name:
          form.display_name.trim() ||
          `${form.title} ${form.doctor_name.trim()}`,
        glove_size: form.glove_size.trim() || "7",
        general_notes: form.general_notes.trim(),
      },
    });
    setOpen(false);
    setError(null);
    setForm((f) => ({
      ...f,
      doctor_name: "",
      sub_specialty: "",
      phone_secondary: "",
      notes: "",
      display_name: "",
      general_notes: "",
    }));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink to={staffPath()} className="mb-4">
        Back to overview
      </BackLink>
      <PageHeader
        kicker="Directory"
        title="Doctors"
        description="Local draft surgeons (staff tools). Public browse uses the API directory — no hospital lock-in."
        icon={<IconProfile className="h-4 w-4" />}
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-teal px-3 py-1.5 text-[13px] text-white hover:bg-leaf"
            onClick={() => setOpen((v) => !v)}
          >
            <IconPlus />
            {open ? "Close form" : "Add doctor"}
          </button>
        }
      />

      {open && (
        <form
          onSubmit={onSubmit}
          className="mt-6 grid gap-4 border border-line bg-paper p-5 sm:grid-cols-2"
        >
          <label className="text-sm">
            Title
            <select
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            >
              {["Prof", "Dr", "Mr", "Ms", "Mrs"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Full name
            <input
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.doctor_name}
              onChange={(e) =>
                setForm({ ...form, doctor_name: e.target.value })
              }
            />
          </label>
          <label className="text-sm">
            Specialty
            <select
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.specialty_id}
              onChange={(e) =>
                setForm({ ...form, specialty_id: e.target.value })
              }
            >
              {specialtyList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Sub-specialty
            <input
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.sub_specialty}
              onChange={(e) =>
                setForm({ ...form, sub_specialty: e.target.value })
              }
            />
          </label>
          <p className="text-sm text-muted sm:col-span-2">
            Clinic · {clinic?.name ?? form.practice_or_hospital}
          </p>
          <label className="text-sm">
            Address
            <input
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label className="text-sm">
            City
            <input
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Primary phone
            <input
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.phone_primary}
              onChange={(e) =>
                setForm({ ...form, phone_primary: e.target.value })
              }
            />
          </label>
          <label className="text-sm">
            Glove size
            <input
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.glove_size}
              onChange={(e) => setForm({ ...form, glove_size: e.target.value })}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Doctor notes
            <textarea
              className="mt-1.5 min-h-20 w-full border border-line px-3 py-2"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            General surgical notes (on every card)
            <textarea
              className="mt-1.5 min-h-20 w-full border border-line px-3 py-2"
              value={form.general_notes}
              onChange={(e) =>
                setForm({ ...form, general_notes: e.target.value })
              }
            />
          </label>
          {error && <p className="text-sm text-copper sm:col-span-2">{error}</p>}
          <button
            type="submit"
            className="bg-scrub px-4 py-2 text-sm text-white sm:col-span-2 hover:bg-scrub-deep"
          >
            Save doctor
          </button>
        </form>
      )}

      <div className="mt-6 border border-line bg-paper px-4 py-3">
        <label className="relative block">
          <span className="sr-only">Search doctors</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky" />
          <input
            className="w-full border border-line py-2 pl-10 pr-3 text-sm"
            placeholder="Search doctor name, specialty, hospital, or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {doctors.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No doctors added yet.</p>
      ) : list.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No doctors match “{query.trim()}”.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line bg-paper">
          {list.map((doctor) => {
            const surgeon = getSurgeonByDoctor(doctor.doctor_id);
            return (
              <li
                key={doctor.doctor_id}
                className="flex flex-wrap items-center gap-4 px-4 py-4"
              >
                <DoctorAvatar doctor={doctor} size="md" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-medium">
                    {doctorFullName(doctor)}
                  </h2>
                  <p className="text-[13px] text-muted">
                    {specialtyList.find((s) => s.id === doctor.specialty_id)?.name}
                    {doctor.sub_specialty ? ` · ${doctor.sub_specialty}` : ""}
                  </p>
                  <p className="text-[13px] text-muted">
                    {doctor.practice_or_hospital}
                  </p>
                  {surgeon && (
                    <p className="mt-1 text-[12px] text-muted">
                      Glove {surgeon.glove_size}
                      {surgeon.general_notes
                        ? ` · ${surgeon.general_notes.slice(0, 80)}${surgeon.general_notes.length > 80 ? "…" : ""}`
                        : ""}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
