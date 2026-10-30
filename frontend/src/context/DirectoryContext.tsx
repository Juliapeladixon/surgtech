import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import seedDoctors from "../data/doctors.json";
import seedSurgeons from "../data/surgeons.json";
import type { Clinic, Doctor, SavedCard, Surgeon } from "../types";
import {
  hasSeededCards,
  markCardsSeeded,
  readCards,
  readExtraDoctors,
  readExtraSurgeons,
  writeCards,
  writeExtraDoctors,
  writeExtraSurgeons,
} from "../lib/storage";
import {
  clinicList,
  clinicMatchesDoctor,
  findClinicForDoctor,
  getSurgeonByDoctor as getSeedSurgeon,
  slugify,
} from "../lib/catalog";

interface DirectoryValue {
  clinics: Clinic[];
  doctors: Doctor[];
  surgeons: Surgeon[];
  cards: SavedCard[];
  refreshCards: () => void;
  addDoctor: (input: {
    doctor: Omit<Doctor, "doctor_id">;
    surgeon: Omit<Surgeon, "id" | "doctor_id">;
  }) => Doctor;
  getDoctor: (id: number) => Doctor | undefined;
  getSurgeonByDoctor: (doctorId: number) => Surgeon | undefined;
  cardsForDoctor: (doctorId: number) => SavedCard[];
  getCard: (id: string) => SavedCard | undefined;
  getClinic: (slug: string) => Clinic | undefined;
  clinicForDoctor: (doctor: Doctor) => Clinic | undefined;
  doctorsForClinic: (slug: string) => Doctor[];
  cardsForClinic: (slug: string) => SavedCard[];
}

const DirectoryContext = createContext<DirectoryValue | null>(null);

function seedSampleCardsIfNeeded() {
  if (hasSeededCards()) return;
  const existing = readCards();
  if (existing.length > 0) {
    markCardsSeeded();
    return;
  }

  const samples: SavedCard[] = [
    {
      id: "seed-tonsillectomy-chidziva",
      doctorId: 1,
      surgeonId: 1,
      procedureName: "Tonsillectomy",
      procedureId: 1,
      patientPosition: "Supine",
      anaesthesiaType: "GA",
      selectedSources: ["suture", "instrument", "pack"],
      items: [
        { item_source: "pack", item_id: 7, quantity: 1, item_notes: "" },
        { item_source: "pack", item_id: 3, quantity: 1, item_notes: "" },
        { item_source: "pack", item_id: 5, quantity: 1, item_notes: "" },
        { item_source: "suture", item_id: 2, quantity: 4, item_notes: "ties" },
        { item_source: "suture", item_id: 9, quantity: 1, item_notes: "" },
        {
          item_source: "instrument",
          item_id: 16,
          quantity: 1,
          item_notes: "",
        },
        {
          item_source: "instrument",
          item_id: 17,
          quantity: 1,
          item_notes: "",
        },
        {
          item_source: "instrument",
          item_id: 18,
          quantity: 1,
          item_notes: "",
        },
      ],
      notes: "Always prepare for bronchoscope.",
      status: "ACTIVE",
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: "seed-vv-machawira",
      doctorId: 2,
      surgeonId: 2,
      procedureName: "Stripping of varicose veins",
      procedureId: 6,
      patientPosition: "Supine",
      anaesthesiaType: "GA",
      selectedSources: ["suture", "instrument", "pack"],
      items: [
        { item_source: "pack", item_id: 1, quantity: 1, item_notes: "" },
        { item_source: "pack", item_id: 2, quantity: 1, item_notes: "" },
        { item_source: "pack", item_id: 3, quantity: 1, item_notes: "" },
        { item_source: "pack", item_id: 5, quantity: 1, item_notes: "" },
        { item_source: "suture", item_id: 1, quantity: 1, item_notes: "" },
        { item_source: "suture", item_id: 2, quantity: 1, item_notes: "" },
        {
          item_source: "suture",
          item_id: 3,
          quantity: 1,
          item_notes: "colts",
        },
        { item_source: "suture", item_id: 5, quantity: 1, item_notes: "" },
        {
          item_source: "instrument",
          item_id: 1,
          quantity: 10,
          item_notes: "",
        },
        {
          item_source: "instrument",
          item_id: 2,
          quantity: 1,
          item_notes: "",
        },
        {
          item_source: "instrument",
          item_id: 4,
          quantity: 1,
          item_notes: "",
        },
        {
          item_source: "instrument",
          item_id: 10,
          quantity: 1,
          item_notes: "Mayo towel clips",
        },
      ],
      notes: "Sandbag or pillow for positioning + saline",
      status: "ACTIVE",
      createdAt: "2024-06-12T08:00:00.000Z",
    },
    {
      id: "seed-hernia-nyathi",
      doctorId: 3,
      surgeonId: 3,
      procedureName: "Open inguinal hernia repair",
      procedureId: 9,
      patientPosition: "Supine",
      anaesthesiaType: "Spinal",
      selectedSources: ["suture", "instrument", "pack"],
      items: [
        { item_source: "pack", item_id: 6, quantity: 1, item_notes: "" },
        { item_source: "pack", item_id: 3, quantity: 1, item_notes: "" },
        { item_source: "pack", item_id: 5, quantity: 1, item_notes: "" },
        { item_source: "suture", item_id: 7, quantity: 1, item_notes: "" },
        { item_source: "suture", item_id: 10, quantity: 1, item_notes: "mesh fix" },
        {
          item_source: "instrument",
          item_id: 1,
          quantity: 6,
          item_notes: "",
        },
        {
          item_source: "instrument",
          item_id: 12,
          quantity: 2,
          item_notes: "",
        },
      ],
      notes: "Double-glove. Keep mesh options ready.",
      status: "ACTIVE",
      createdAt: "2026-08-20T08:00:00.000Z",
    },
  ];

  writeCards(samples);
  markCardsSeeded();
}

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [extraDoctors, setExtraDoctors] = useState<Doctor[]>(() =>
    readExtraDoctors<Doctor>(),
  );
  const [extraSurgeons, setExtraSurgeons] = useState<Surgeon[]>(() =>
    readExtraSurgeons<Surgeon>(),
  );
  const [cards, setCards] = useState<SavedCard[]>(() => {
    seedSampleCardsIfNeeded();
    return readCards();
  });

  const doctors = useMemo(
    () => [...(seedDoctors as Doctor[]), ...extraDoctors],
    [extraDoctors],
  );
  const surgeons = useMemo(
    () => [...(seedSurgeons as Surgeon[]), ...extraSurgeons],
    [extraSurgeons],
  );
  const clinics = useMemo(() => {
    const extras: Clinic[] = [];
    for (const doctor of doctors) {
      if (findClinicForDoctor(doctor, [...clinicList, ...extras])) continue;
      const name = doctor.practice_or_hospital.trim();
      if (!name) continue;
      extras.push({
        id: 100 + extras.length,
        slug: slugify(name),
        name,
        short_name: name,
        city: doctor.city,
        address: doctor.address,
        phone: doctor.phone_primary,
        welcome: `Welcome to ${name}. Preference cards for surgeons at this site.`,
        notices: [],
        aliases: [name],
      });
    }
    return [...clinicList, ...extras];
  }, [doctors]);

  const value = useMemo<DirectoryValue>(
    () => ({
      clinics,
      doctors,
      surgeons,
      cards,
      refreshCards: () => setCards(readCards()),
      getDoctor: (id) => doctors.find((d) => d.doctor_id === id),
      getSurgeonByDoctor: (doctorId) =>
        surgeons.find((s) => s.doctor_id === doctorId) ??
        getSeedSurgeon(doctorId),
      cardsForDoctor: (doctorId) =>
        cards.filter((c) => c.doctorId === doctorId && c.status === "ACTIVE"),
      getCard: (id) => cards.find((c) => c.id === id),
      getClinic: (slug) => clinics.find((c) => c.slug === slug),
      clinicForDoctor: (doctor) => findClinicForDoctor(doctor, clinics),
      doctorsForClinic: (slug) => {
        const clinic = clinics.find((c) => c.slug === slug);
        if (!clinic) return [];
        return doctors.filter((d) => clinicMatchesDoctor(clinic, d));
      },
      cardsForClinic: (slug) => {
        const clinic = clinics.find((c) => c.slug === slug);
        if (!clinic) return [];
        const ids = new Set(
          doctors
            .filter((d) => clinicMatchesDoctor(clinic, d))
            .map((d) => d.doctor_id),
        );
        return cards.filter((c) => ids.has(c.doctorId) && c.status === "ACTIVE");
      },
      addDoctor: ({ doctor, surgeon }) => {
        const doctor_id =
          Math.max(0, ...doctors.map((d) => d.doctor_id)) + 1;
        const nextDoctor: Doctor = { ...doctor, doctor_id };
        const nextSurgeon: Surgeon = {
          ...surgeon,
          id: Math.max(0, ...surgeons.map((s) => s.id)) + 1,
          doctor_id,
        };
        const nextDoctors = [...extraDoctors, nextDoctor];
        const nextSurgeons = [...extraSurgeons, nextSurgeon];
        writeExtraDoctors(nextDoctors);
        writeExtraSurgeons(nextSurgeons);
        setExtraDoctors(nextDoctors);
        setExtraSurgeons(nextSurgeons);
        return nextDoctor;
      },
    }),
    [cards, clinics, doctors, extraDoctors, extraSurgeons, surgeons],
  );

  return (
    <DirectoryContext.Provider value={value}>
      {children}
    </DirectoryContext.Provider>
  );
}

export function useDirectory() {
  const ctx = useContext(DirectoryContext);
  if (!ctx) throw new Error("useDirectory must be used inside DirectoryProvider");
  return ctx;
}
