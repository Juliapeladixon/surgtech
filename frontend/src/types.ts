export type ItemSource = "suture" | "instrument" | "pack";
export type CardStatus = "DRAFT" | "ACTIVE";
export type StaffRole = "EDITOR" | "ADMIN" | "VIEWER";

export interface Clinic {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  city: string;
  address: string;
  phone: string;
  welcome: string;
  notices: string[];
  aliases: string[];
}

export interface Specialty {
  id: number;
  name: string;
  short_code: string;
  sort_order: number;
  is_active: boolean;
}

export interface Doctor {
  doctor_id: number;
  title: string;
  doctor_name: string;
  specialty_id: number;
  sub_specialty: string;
  practice_or_hospital: string;
  address: string;
  city: string;
  phone_primary: string;
  phone_secondary: string;
  is_group_practice: boolean;
  notes: string;
}

export interface Surgeon {
  id: number;
  doctor_id: number;
  display_name: string;
  glove_size: string;
  general_notes: string;
}

export interface Procedure {
  id: number;
  specialty_id: number;
  name: string;
  aliases: string;
}

export interface StaffAccount {
  username: string;
  password: string;
  display_name: string;
  role: StaffRole;
  clinic_slug: string;
}

export interface Suture {
  suture_id: number;
  material: string;
  size: string;
  item_type: string;
  needle_type: string;
  needle_length_mm: number | null;
  is_absorbable: boolean;
  expiry_date: string | null;
}

export interface SurgicalInstrument {
  instrument_id: number;
  name: string;
  category: string;
  type_or_variant: string;
  is_reusable: boolean;
  condition_status: string;
  last_sterilized_date: string | null;
}

export interface SurgicalPack {
  pack_id: number;
  pack_name: string;
  pack_type: string;
  contents_description: string;
  is_reusable: boolean;
  sterile_until: string | null;
  last_sterilized_date: string | null;
}

export interface CardItem {
  item_source: ItemSource;
  item_id: number;
  quantity: number;
  item_notes: string;
}

export interface DraftCard {
  doctorId: number | null;
  procedureName: string;
  procedureId: number | null;
  patientPosition: string;
  anaesthesiaType: string;
  selectedSources: ItemSource[];
  items: CardItem[];
  notes: string;
}

export interface SavedCard extends Omit<DraftCard, "doctorId"> {
  id: string;
  doctorId: number;
  surgeonId: number;
  status: CardStatus;
  createdAt: string;
}

export interface StaffSession {
  token: string;
  id: number;
  username: string;
  displayName: string;
  role: StaffRole;
  /** @deprecated hospital scoping removed — kept optional for older staff screens */
  clinicSlug?: string;
  hospitalId?: number | null;
  hospitalName?: string;
  canEdit: boolean;
  mustChangePassword: boolean;
}

export interface DoctorContext {
  doctor: Doctor;
  surgeon: Surgeon;
  specialty: Specialty;
}
