import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CardPreview } from "../components/CardPreview";
import { IconCard, IconDownload, IconEdit, IconPrint } from "../components/Icons";
import { BackLink, PageHeader } from "../components/PageChrome";
import {
  lastSourceRoute,
  useCardBuilder,
} from "../context/CardBuilderContext";
import { useDirectory } from "../context/DirectoryContext";
import { clinicCardPath, staffPath } from "../lib/catalog";
import { downloadPreferenceCardPdf } from "../lib/pdf";
import { useDraftDoctorCtx } from "./PreferenceCardSetup";

export function PreviewPage() {
  const { draft, saveCard } = useCardBuilder();
  const doctorCtx = useDraftDoctorCtx();
  const { clinicForDoctor } = useDirectory();
  const navigate = useNavigate();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft.doctorId || !draft.procedureName.trim() || draft.selectedSources.length === 0) {
    return <Navigate to={staffPath("/preference-card")} replace />;
  }
  if (!doctorCtx) return <Navigate to={staffPath("/preference-card")} replace />;

  const onSave = () => {
    try {
      const card = saveCard();
      setSavedId(card.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save card.");
    }
  };

  const onDownload = async () => {
    setError(null);
    setDownloading(true);
    try {
      if (!savedId) saveCard();
      await downloadPreferenceCardPdf(draft, doctorCtx);
    } catch (err) {
      console.error(err);
      setError("Could not download the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink
        to={lastSourceRoute(draft.selectedSources)}
        className="mb-4"
      >
        Back to items
      </BackLink>
      <PageHeader
        kicker="Review"
        title="Ready to publish"
        description="Save this card to the directory so theatre teams can look it up."
        icon={<IconCard className="h-4 w-4" />}
      />

      <div className="mt-6">
        <CardPreview
          card={draft}
          doctorCtx={doctorCtx}
          status={savedId ? "ACTIVE" : "DRAFT"}
        />
      </div>

      {error && <p className="mt-3 text-sm text-copper">{error}</p>}

      <div className="no-print mt-6 flex flex-wrap gap-3">
        <Link
          to={staffPath("/preference-card")}
          className="inline-flex items-center gap-2 border border-line px-3 py-1.5 text-[13px] hover:bg-linen"
        >
          <IconEdit className="h-3.5 w-3.5 text-teal" />
          Edit setup
        </Link>
        <button
          className="bg-scrub px-3 py-1.5 text-[13px] text-white hover:bg-scrub-deep"
          onClick={onSave}
        >
          {savedId ? "Saved" : "Save to directory"}
        </button>
        <button
          className="inline-flex items-center gap-2 border border-line px-3 py-1.5 text-[13px] hover:bg-linen disabled:opacity-60"
          onClick={onDownload}
          disabled={downloading}
        >
          <IconDownload className="h-3.5 w-3.5 text-sky" />
          {downloading ? "Preparing…" : "PDF"}
        </button>
        <button
          className="inline-flex items-center gap-2 border border-line px-3 py-1.5 text-[13px] hover:bg-linen"
          onClick={() => {
            const id = savedId ?? saveCard().id;
            setSavedId(id);
            const clinic = clinicForDoctor(doctorCtx.doctor);
            navigate(
              clinic ? clinicCardPath(clinic.slug, id) : `/cards/${id}`,
            );
          }}
        >
          <IconPrint className="h-3.5 w-3.5 text-teal" />
          Open public view
        </button>
      </div>
    </div>
  );
}
