import specialties from "../data/specialties.json";
import clinics from "../data/clinics.json";
import doctors from "../data/doctors.json";
import surgeons from "../data/surgeons.json";
import procedures from "../data/procedures.json";
import sutures from "../data/sutures.json";
import instruments from "../data/instruments.json";
import packs from "../data/packs.json";
import type {
  CardItem,
  Clinic,
  Doctor,
  ItemSource,
  Procedure,
  Specialty,
  Surgeon,
  SurgicalInstrument,
  SurgicalPack,
  Suture,
} from "../types";

/** @deprecated hospital/clinic scoping removed — kept for legacy redirects */
export const DEMO_CLINIC_SLUG = "parirenyatwa";

/** @deprecated hospital scoping removed */
export function clinicSlugForHospital(
  _hospitalId?: number | null,
  _hospitalName?: string | null,
) {
  return DEMO_CLINIC_SLUG;
}

export const clinicList = clinics as Clinic[];
export const specialtyList = specialties as Specialty[];
export const doctorList = doctors as Doctor[];
export const surgeonList = surgeons as Surgeon[];
export const procedureList = procedures as Procedure[];
export const sutureList = sutures as Suture[];
export const instrumentList = instruments as SurgicalInstrument[];
export const packList = packs as SurgicalPack[];

export const SOURCE_LABELS: Record<ItemSource, string> = {
  suture: "Sutures",
  instrument: "Surgical instruments",
  pack: "Surgical packs",
};

export const SOURCE_ORDER: ItemSource[] = ["suture", "instrument", "pack"];

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "clinic"
  );
}

export function clinicHome(_slug?: string) {
  return "/";
}

export function staffBase(_slug?: string) {
  return "/staff";
}

export function staffPath(suffix = "", _slug?: string) {
  const path = !suffix
    ? ""
    : suffix.startsWith("/")
      ? suffix
      : `/${suffix}`;
  return `${staffBase()}${path}`;
}

export function clinicSpecialtyPath(_slug: string, specialtyId: number) {
  return `/browse/${specialtyId}`;
}

export function clinicDoctorPath(
  _slug: string,
  specialtyId: number,
  doctorId: number,
) {
  return `/browse/${specialtyId}/${doctorId}`;
}

export function clinicCardPath(_slug: string | undefined, cardId: string) {
  return `/cards/${cardId}`;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export function clinicMatchesDoctor(clinic: Clinic, doctor: Doctor) {
  const practice = normalizeName(doctor.practice_or_hospital);
  if (!practice) return false;
  const names = [clinic.name, clinic.short_name, ...clinic.aliases].map(
    normalizeName,
  );
  return names.some(
    (name) => practice === name || practice.includes(name) || name.includes(practice),
  );
}

export function findClinicForDoctor(doctor: Doctor, clinics: Clinic[]) {
  return clinics.find((clinic) => clinicMatchesDoctor(clinic, doctor));
}

export function getSeedClinic(slug: string) {
  return clinicList.find((c) => c.slug === slug);
}

export function getSpecialty(id: number) {
  return specialtyList.find((s) => s.id === id);
}

export function getDoctor(id: number) {
  return doctorList.find((d) => d.doctor_id === id);
}

export function getSurgeonByDoctor(doctorId: number) {
  return surgeonList.find((s) => s.doctor_id === doctorId);
}

export function getProcedure(id: number) {
  return procedureList.find((p) => p.id === id);
}

export function proceduresForSpecialty(specialtyId: number) {
  return procedureList.filter((p) => p.specialty_id === specialtyId);
}

export function matchProcedure(query: string, specialtyId?: number) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const pool = specialtyId
    ? proceduresForSpecialty(specialtyId)
    : procedureList;
  return pool.filter((p) => {
    const hay = `${p.name} ${p.aliases}`.toLowerCase();
    return hay.includes(q);
  });
}

export function sutureLabel(s: Suture) {
  const needle =
    s.needle_type !== "None"
      ? ` · ${s.needle_type}${s.needle_length_mm ? ` ${s.needle_length_mm}mm` : ""}`
      : "";
  return `${s.size} ${s.material} ${s.item_type}${needle}`;
}

export function instrumentLabel(i: SurgicalInstrument) {
  return `${i.name}${i.type_or_variant ? ` (${i.type_or_variant})` : ""}`;
}

export function packLabel(p: SurgicalPack) {
  return p.pack_name;
}

export function resolveItem(item: CardItem) {
  if (item.item_source === "suture") {
    const row = sutureList.find((s) => s.suture_id === item.item_id);
    return row ? sutureLabel(row) : `Suture #${item.item_id}`;
  }
  if (item.item_source === "instrument") {
    const row = instrumentList.find((i) => i.instrument_id === item.item_id);
    return row ? instrumentLabel(row) : `Instrument #${item.item_id}`;
  }
  const row = packList.find((p) => p.pack_id === item.item_id);
  return row ? packLabel(row) : `Pack #${item.item_id}`;
}

export function itemsBySource(items: CardItem[], source: ItemSource) {
  return items.filter((i) => i.item_source === source);
}

export function doctorFullName(doctor: Doctor) {
  return `${doctor.title} ${doctor.doctor_name}`;
}
