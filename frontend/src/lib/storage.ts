import type { DraftCard, SavedCard, StaffSession } from "../types";

const SESSION_KEY = "surgtech.staff.session";
const LEGACY_SESSION_KEY = "surgtech.staff";
const DRAFT_KEY = "surgtech.draft";
const CARDS_KEY = "surgtech.cards";
const DOCTORS_KEY = "surgtech.doctors.extra";
const SURGEONS_KEY = "surgtech.surgeons.extra";
const SEEDED_KEY = "surgtech.cards.seeded.v2";

export const emptyDraft = (): DraftCard => ({
  doctorId: null,
  procedureName: "",
  procedureId: null,
  patientPosition: "",
  anaesthesiaType: "",
  selectedSources: [],
  items: [],
  notes: "",
});

export function readStaffSession(): StaffSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
      return null;
    }
    const parsed = JSON.parse(raw) as StaffSession;
    if (!parsed?.token || !parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStaffSession(session: StaffSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

export function readDraft(): DraftCard {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft();
    return { ...emptyDraft(), ...JSON.parse(raw) };
  } catch {
    return emptyDraft();
  }
}

export function writeDraft(draft: DraftCard) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export function readCards(): SavedCard[] {
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    return raw ? (JSON.parse(raw) as SavedCard[]) : [];
  } catch {
    return [];
  }
}

export function writeCards(cards: SavedCard[]) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

export function readExtraDoctors<T>(): T[] {
  try {
    const raw = localStorage.getItem(DOCTORS_KEY);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function writeExtraDoctors<T>(rows: T[]) {
  localStorage.setItem(DOCTORS_KEY, JSON.stringify(rows));
}

export function readExtraSurgeons<T>(): T[] {
  try {
    const raw = localStorage.getItem(SURGEONS_KEY);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function writeExtraSurgeons<T>(rows: T[]) {
  localStorage.setItem(SURGEONS_KEY, JSON.stringify(rows));
}

export function hasSeededCards() {
  return localStorage.getItem(SEEDED_KEY) === "1";
}

export function markCardsSeeded() {
  localStorage.setItem(SEEDED_KEY, "1");
}
