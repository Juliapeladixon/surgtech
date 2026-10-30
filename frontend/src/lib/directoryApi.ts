import { fetchAllPages, request, type Paginated } from "./api";

export interface ApiSpecialty {
  id: number;
  name: string;
  short_code: string;
  sort_order: number;
  is_active: boolean;
}

export interface ApiDoctor {
  doctor_id: number;
  title: string;
  doctor_name: string;
  specialty: number;
  specialty_name: string;
  sub_specialty: string;
  practice_or_hospital: string;
  address: string;
  city: string;
  phone_primary: string;
  phone_secondary: string;
  is_group_practice: boolean;
  notes: string;
  is_surgeon: boolean;
}

export interface ApiProcedure {
  id: number;
  name: string;
  aliases: string;
  specialty: number;
  specialty_name: string;
}

export interface ApiCardListItem {
  id: number;
  title: string;
  card_title: string;
  surgeon: number;
  surgeon_name: string;
  procedure: number;
  procedure_name: string;
  specialty: number;
  specialty_name: string;
  status: string;
  version_no: number;
  anaesthesia_type: string;
  card_date: string | null;
  review_due_on: string | null;
  item_count: number;
  updated_at: string;
}

export interface ApiCardItem {
  card_item_id: number;
  item_source: "suture" | "instrument" | "pack";
  item_id: number;
  quantity: number;
  item_notes: string;
  item_label: string;
}

export interface ApiCardNote {
  id: number;
  note_type: string;
  body: string;
  sort_order: number;
}

export interface ApiCardDetail {
  id: number;
  title: string;
  card_title: string;
  surgeon: number;
  surgeon_name: string;
  procedure: number;
  procedure_name: string;
  specialty: number;
  specialty_name: string;
  status: string;
  version_no: number;
  patient_position: string;
  position_aids: string;
  anaesthesia_type: string;
  glove_size: string;
  effective_glove_size: string;
  skin_prep: string;
  diathermy_settings: string;
  estimated_minutes: number | null;
  card_date: string | null;
  review_due_on: string | null;
  items: ApiCardItem[];
  notes: ApiCardNote[];
  updated_at: string;
}

export interface ApiCardContext {
  id: number;
  title: string;
  status: string;
  patient_position: string;
  anaesthesia_type: string;
  effective_glove_size: string;
  doctor: {
    doctor_id: number;
    title: string;
    doctor_name: string;
    surgeon_display_name: string;
    specialty: { id: number; name: string; short_code: string } | null;
  };
  procedure: {
    id: number;
    name: string;
    aliases: string;
    specialty: { id: number; name: string; short_code: string } | null;
  };
  items: ApiCardItem[];
  notes: ApiCardNote[];
  updated_at: string;
}

export function apiDoctorName(doctor: Pick<ApiDoctor, "title" | "doctor_name">) {
  return `${doctor.title} ${doctor.doctor_name}`.trim();
}

export function listSpecialties() {
  return fetchAllPages<ApiSpecialty>(
    "/api/specialties/?is_active=true&page_size=100&ordering=sort_order",
  );
}

export function getSpecialty(id: number) {
  return request<ApiSpecialty>(`/api/specialties/${id}/`);
}

export function listSpecialtyDoctors(specialtyId: number) {
  return fetchAllPages<ApiDoctor>(
    `/api/specialties/${specialtyId}/doctors/?has_surgeon=true&page_size=100`,
  );
}

/** Global doctor search (supports DRF ?search= on /doctors/). */
export async function searchDoctors(search: string) {
  const q = search.trim();
  if (!q) return [];
  const rows = await fetchAllPages<ApiDoctor>(
    `/api/doctors/?search=${encodeURIComponent(q)}&page_size=50`,
  );
  return rows.filter((doctor) => doctor.is_surgeon);
}

/** Global procedure search (name + aliases). */
export async function searchProcedures(search: string) {
  const q = search.trim();
  if (!q) return [];
  return fetchAllPages<ApiProcedure>(
    `/api/procedures/?search=${encodeURIComponent(q)}&page_size=50`,
  );
}

export function listProcedureCards(procedureId: number, status = "ACTIVE") {
  return fetchAllPages<ApiCardContext>(
    `/api/procedures/${procedureId}/cards/?status=${encodeURIComponent(status)}&page_size=50`,
  );
}

/** Card list search across procedure, surgeon, and title. */
export async function searchCards(search: string, status = "ACTIVE") {
  const q = search.trim();
  if (!q) return [];
  return fetchAllPages<ApiCardListItem>(
    `/api/cards/?status=${encodeURIComponent(status)}&search=${encodeURIComponent(q)}&page_size=30`,
  );
}

export function getDoctor(id: number) {
  return request<ApiDoctor>(`/api/doctors/${id}/`);
}

export function listDoctorProcedures(doctorId: number, usedOnly = true) {
  const used = usedOnly ? "&used=true" : "";
  return fetchAllPages<ApiProcedure>(
    `/api/doctors/${doctorId}/procedures/?page_size=100${used}`,
  );
}

export function listDoctorCards(doctorId: number, status = "ACTIVE") {
  return fetchAllPages<ApiCardContext>(
    `/api/doctors/${doctorId}/cards/?status=${encodeURIComponent(status)}&page_size=100`,
  );
}

export function listRecentCards(pageSize = 12) {
  return request<Paginated<ApiCardListItem>>(
    `/api/cards/?status=ACTIVE&ordering=-updated_at&page_size=${pageSize}`,
  ).then((page) => page.results);
}

export function getCardDetail(cardId: number | string) {
  return request<ApiCardDetail>(`/api/cards/${cardId}/`);
}

export function cardsByContext(params: {
  doctor?: number;
  procedure?: number;
  specialty?: number;
  status?: string;
}) {
  const query = new URLSearchParams();
  if (params.doctor != null) query.set("doctor", String(params.doctor));
  if (params.procedure != null) query.set("procedure", String(params.procedure));
  if (params.specialty != null) query.set("specialty", String(params.specialty));
  if (params.status) query.set("status", params.status);
  return fetchAllPages<ApiCardContext>(
    `/api/cards/by-context/?${query.toString()}&page_size=50`,
  );
}
