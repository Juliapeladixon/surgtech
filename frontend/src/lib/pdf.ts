import { jsPDF } from "jspdf";
import {
  doctorFullName,
  itemsBySource,
  resolveItem,
  SOURCE_LABELS,
  SOURCE_ORDER,
} from "./catalog";
import type { ApiCardDetail } from "./directoryApi";
import type { DoctorContext, DraftCard } from "../types";

const NAVY: [number, number, number] = [10, 79, 156];
const TEAL: [number, number, number] = [13, 138, 106];
const INK: [number, number, number] = [12, 35, 64];
const MUTED: [number, number, number] = [90, 107, 125];
const LINE: [number, number, number] = [213, 224, 234];

export function preferenceCardFilename(procedureName: string) {
  const safe = procedureName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `preference-card-${safe || "draft"}.pdf`;
}

export async function downloadPreferenceCardPdf(
  card: DraftCard,
  doctorCtx: DoctorContext,
  filename?: string,
) {
  const { doctor, surgeon, specialty } = doctorCtx;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageWidth, 36, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("SURGTECH OR  ·  THEATRE PREFERENCE CARD", margin, 12);
  pdf.setFontSize(18);
  const title = card.procedureName || "Untitled procedure";
  pdf.text(title, margin, 22, { maxWidth: contentWidth - 30 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(doctor.practice_or_hospital, margin, 30, {
    maxWidth: contentWidth - 30,
  });

  pdf.setFontSize(8);
  pdf.setTextColor(26, 159, 216);
  pdf.text("ACTIVE", pageWidth - margin, 14, { align: "right" });

  y = 46;

  const meta: [string, string][] = [
    ["Surgeon", doctorFullName(doctor)],
    ["Glove size", surgeon.glove_size],
    ["Specialty", specialty.name],
    ["Position", card.patientPosition || "Not specified"],
    ["Anaesthesia", card.anaesthesiaType || "Not specified"],
    ["Hospital / city", doctor.city],
  ];

  const colW = contentWidth / 2;
  pdf.setDrawColor(...LINE);
  meta.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + col * colW;
    const rowY = y + row * 12;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(label.toUpperCase(), x, rowY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    pdf.text(value, x, rowY + 5, { maxWidth: colW - 4 });
  });
  y += Math.ceil(meta.length / 2) * 12 + 6;
  pdf.setDrawColor(...LINE);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  for (const source of SOURCE_ORDER.filter((s) =>
    card.selectedSources.includes(s),
  )) {
    const rows = itemsBySource(card.items, source);
    ensureSpace(16);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...TEAL);
    pdf.text(SOURCE_LABELS[source].toUpperCase(), margin, y);
    y += 6;

    if (rows.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...MUTED);
      pdf.text("No items selected.", margin, y);
      y += 8;
      continue;
    }

    for (const item of rows) {
      const label = resolveItem(item);
      const note = item.item_notes ? ` — ${item.item_notes}` : "";
      const left = `${label}${note}`;
      const qty = `x ${item.quantity}`;
      const lines = pdf.splitTextToSize(left, contentWidth - 18);
      ensureSpace(lines.length * 5 + 3);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...INK);
      pdf.text(lines, margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(qty, pageWidth - margin, y, { align: "right" });
      y += lines.length * 5 + 2;
    }
    y += 4;
  }

  const noteParts = [card.notes, surgeon.general_notes].filter(Boolean);
  if (noteParts.length) {
    ensureSpace(20);
    pdf.setDrawColor(...LINE);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(196, 75, 85);
    pdf.text("NOTES", margin, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    for (const part of noteParts) {
      const lines = pdf.splitTextToSize(part, contentWidth);
      ensureSpace(lines.length * 5 + 4);
      pdf.text(lines, margin, y);
      y += lines.length * 5 + 3;
    }
  }

  ensureSpace(12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text(
    "SurgTech OR · Safer surgeries. Better outcomes.",
    margin,
    pageHeight - 10,
  );

  const name = preferenceCardFilename(
    filename?.replace(/\.pdf$/i, "") || card.procedureName,
  );
  pdf.save(name);
}

export async function downloadApiPreferenceCardPdf(
  card: ApiCardDetail,
  filename?: string,
) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const title = card.title || card.procedure_name || "Untitled procedure";

  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageWidth, 36, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("SURGTECH OR  ·  THEATRE PREFERENCE CARD", margin, 12);
  pdf.setFontSize(18);
  pdf.text(title, margin, 22, { maxWidth: contentWidth - 30 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(card.specialty_name || "Specialty", margin, 30, {
    maxWidth: contentWidth - 30,
  });

  pdf.setFontSize(8);
  pdf.setTextColor(26, 159, 216);
  pdf.text((card.status || "ACTIVE").toUpperCase(), pageWidth - margin, 14, {
    align: "right",
  });

  y = 46;

  const meta: [string, string][] = [
    ["Surgeon", card.surgeon_name || "—"],
    ["Glove size", card.effective_glove_size || card.glove_size || "—"],
    ["Specialty", card.specialty_name || "—"],
    ["Position", card.patient_position || "Not specified"],
    ["Anaesthesia", card.anaesthesia_type || "Not specified"],
    ["Procedure", card.procedure_name || "—"],
  ];

  const colW = contentWidth / 2;
  pdf.setDrawColor(...LINE);
  meta.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + col * colW;
    const rowY = y + row * 12;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(label.toUpperCase(), x, rowY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    pdf.text(value, x, rowY + 5, { maxWidth: colW - 4 });
  });
  y += Math.ceil(meta.length / 2) * 12 + 6;
  pdf.setDrawColor(...LINE);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  const sources = SOURCE_ORDER.filter((source) =>
    card.items.some((item) => item.item_source === source),
  );

  for (const source of sources) {
    const rows = card.items.filter((item) => item.item_source === source);

    ensureSpace(16);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...TEAL);
    pdf.text(SOURCE_LABELS[source].toUpperCase(), margin, y);
    y += 6;

    for (const item of rows) {
      const note = item.item_notes ? ` — ${item.item_notes}` : "";
      const left = `${item.item_label || `Item ${item.item_id}`}${note}`;
      const qty = `x ${item.quantity}`;
      const lines = pdf.splitTextToSize(left, contentWidth - 18);
      ensureSpace(lines.length * 5 + 3);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...INK);
      pdf.text(lines, margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(qty, pageWidth - margin, y, { align: "right" });
      y += lines.length * 5 + 2;
    }
    y += 4;
  }

  const noteParts = card.notes
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((n) => n.body.trim())
    .filter(Boolean);

  if (noteParts.length) {
    ensureSpace(20);
    pdf.setDrawColor(...LINE);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(196, 75, 85);
    pdf.text("NOTES", margin, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    for (const part of noteParts) {
      const lines = pdf.splitTextToSize(part, contentWidth);
      ensureSpace(lines.length * 5 + 4);
      pdf.text(lines, margin, y);
      y += lines.length * 5 + 3;
    }
  }

  ensureSpace(12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text(
    "SurgTech OR · Safer surgeries. Better outcomes.",
    margin,
    pageHeight - 10,
  );

  pdf.save(
    preferenceCardFilename(
      filename?.replace(/\.pdf$/i, "") || card.procedure_name || card.title,
    ),
  );
}
