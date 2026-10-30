import { useState } from "react";
import { Link } from "react-router-dom";
import { CardPreview } from "../components/CardPreview";
import { BackLink, EmptyState, PageHeader } from "../components/PageChrome";
import {
  IconCard,
  IconClose,
  IconDownload,
  IconEdit,
  IconEye,
  IconPlus,
} from "../components/Icons";
import { useStaff } from "../context/AuthContext";
import { useCardBuilder } from "../context/CardBuilderContext";
import { useDirectory } from "../context/DirectoryContext";
import {
  clinicCardPath,
  DEMO_CLINIC_SLUG,
  doctorFullName,
  getSpecialty,
  itemsBySource,
  SOURCE_LABELS,
  SOURCE_ORDER,
  staffPath,
} from "../lib/catalog";
import { downloadPreferenceCardPdf } from "../lib/pdf";

export function MyCardsPage() {
  const staff = useStaff();
  const { loadCard, resetDraft } = useCardBuilder();
  const {
    getDoctor,
    getSurgeonByDoctor,
    refreshCards,
    clinicForDoctor,
    cardsForClinic,
  } = useDirectory();
  const cards = cardsForClinic(staff.clinicSlug ?? DEMO_CLINIC_SLUG);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDownload = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const doctor = getDoctor(card.doctorId);
    const surgeon = getSurgeonByDoctor(card.doctorId);
    const specialty = doctor ? getSpecialty(doctor.specialty_id) : undefined;
    if (!doctor || !surgeon || !specialty) {
      setError("Doctor record missing for this card.");
      return;
    }
    setError(null);
    setDownloading(true);
    try {
      await downloadPreferenceCardPdf(card, { doctor, surgeon, specialty });
    } catch (err) {
      console.error(err);
      setError("Could not download the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink to={staffPath()} className="mb-4">
        Back to overview
      </BackLink>
      <PageHeader
        kicker="Library"
        title="Preference cards"
        description="Review, edit, and download local draft cards. Public file is driven by the API."
        icon={<IconCard className="h-4 w-4" />}
        action={
          <Link
            to={staffPath("/preference-card")}
            onClick={resetDraft}
            className="inline-flex items-center gap-2 bg-teal px-3 py-1.5 text-[13px] text-white hover:bg-leaf"
          >
            <IconPlus className="h-3.5 w-3.5" />
            New card
          </Link>
        }
      />

      {error && <p className="mt-4 text-sm text-copper">{error}</p>}

      {cards.length === 0 ? (
        <EmptyState>No cards saved yet. Create one from New card.</EmptyState>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line bg-paper">
          {cards.map((card) => {
            const isOpen = viewingId === card.id;
            const doctor = getDoctor(card.doctorId);
            const surgeon = getSurgeonByDoctor(card.doctorId);
            const specialty = doctor
              ? getSpecialty(doctor.specialty_id)
              : undefined;
            return (
              <li key={card.id}>
                <div className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-medium">
                        {card.procedureName}
                      </h2>
                      <p className="text-[13px] text-muted">
                        {doctor ? doctorFullName(doctor) : "Unknown doctor"}
                        {specialty ? ` · ${specialty.short_code}` : ""}
                        {" · "}
                        {card.patientPosition || "Position not set"} ·{" "}
                        {card.anaesthesiaType || "Anaesthesia not set"}
                      </p>
                      <p className="mt-1 text-[12px] text-muted">
                        {SOURCE_ORDER.filter((s) =>
                          card.selectedSources.includes(s),
                        )
                          .map(
                            (s) =>
                              `${itemsBySource(card.items, s).length} ${SOURCE_LABELS[s].toLowerCase()}`,
                          )
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="text-[11px] uppercase tracking-wider text-muted">
                      {card.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-muted hover:text-ink"
                      onClick={() => setViewingId(isOpen ? null : card.id)}
                    >
                      {isOpen ? (
                        <IconClose className="h-3.5 w-3.5 text-copper" />
                      ) : (
                        <IconEye className="h-3.5 w-3.5 text-sky" />
                      )}
                      {isOpen ? "Hide" : "View"}
                    </button>
                    <Link
                      to={staffPath("/preference-card")}
                      className="inline-flex items-center gap-1.5 text-muted hover:text-ink"
                      onClick={() => loadCard(card)}
                    >
                      <IconEdit className="h-3.5 w-3.5 text-teal" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-muted hover:text-ink disabled:opacity-60"
                      onClick={() => onDownload(card.id)}
                      disabled={downloading}
                    >
                      <IconDownload className="h-3.5 w-3.5 text-sky" />
                      PDF
                    </button>
                    <Link
                      to={
                        doctor && clinicForDoctor(doctor)
                          ? clinicCardPath(clinicForDoctor(doctor)!.slug, card.id)
                          : `/cards/${card.id}`
                      }
                      className="inline-flex items-center gap-1.5 text-muted hover:text-ink"
                      onClick={() => refreshCards()}
                    >
                      <IconCard className="h-3.5 w-3.5 text-teal" />
                      Public
                    </Link>
                  </div>
                </div>

                {isOpen && doctor && surgeon && specialty && (
                  <div className="border-t border-line bg-linen px-4 py-5">
                    <CardPreview
                      card={card}
                      doctorCtx={{ doctor, surgeon, specialty }}
                      status={card.status}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
