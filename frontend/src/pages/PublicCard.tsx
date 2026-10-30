import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ApiCardPreview } from "../components/ApiCardPreview";
import { BackLink, PageHeader, StepTrail } from "../components/PageChrome";
import { IconCard, IconDownload, IconPrint } from "../components/Icons";
import { ApiError } from "../lib/api";
import { getCardDetail, type ApiCardDetail } from "../lib/directoryApi";
import { downloadApiPreferenceCardPdf } from "../lib/pdf";
import { useClinic } from "../lib/useClinic";

export function PublicCardPage() {
  const { cardId } = useParams();
  const { clinic, base } = useClinic();
  const [card, setCard] = useState<ApiCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCardDetail(cardId)
      .then((row) => {
        if (!cancelled) setCard(row);
      })
      .catch((err) => {
        if (cancelled) return;
        setCard(null);
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load this preference card.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (!clinic) return <Navigate to="/" replace />;

  const onDownload = async () => {
    if (!card) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadApiPreferenceCardPdf(card);
    } catch (err) {
      console.error(err);
      setDownloadError("Could not download the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const specialtyBack =
    card?.specialty != null
      ? `${base}/browse/${card.specialty}`
      : "/";

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to={specialtyBack}>
        {card?.specialty_name
          ? `Back to ${card.specialty_name} doctors`
          : "Back to home"}
      </BackLink>

      <div className="mt-3">
        <StepTrail
          steps={[
            { label: "Home", to: "/" },
            {
              label: card?.specialty_name ?? "Specialty",
              to:
                card?.specialty != null
                  ? `${base}/browse/${card.specialty}`
                  : undefined,
            },
            {
              label: card?.surgeon_name ?? "Doctor",
              to:
                card?.specialty != null
                  ? `${base}/browse/${card.specialty}`
                  : undefined,
            },
            {
              label: card?.title || card?.procedure_name || "Card",
              current: true,
            },
          ]}
        />
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted">Loading preference card…</p>
      ) : error || !card ? (
        <div className="mt-8">
          <p className="text-sm text-copper">
            {error || "Preference card not found."}
          </p>
          <BackLink to={base} className="mt-3">
            Back to home
          </BackLink>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <PageHeader
              kicker={card.specialty_name}
              title={card.title || card.procedure_name}
              description={`${card.surgeon_name} · ${card.specialty_name}`}
              icon={<IconCard className="h-4 w-4" />}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-1.5 text-[13px] text-white hover:bg-white/20 disabled:opacity-60"
                    onClick={onDownload}
                    disabled={downloading}
                  >
                    <IconDownload className="h-3.5 w-3.5" />
                    {downloading ? "Preparing…" : "Download PDF"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-1.5 text-[13px] text-white hover:bg-white/20"
                    onClick={() => window.print()}
                  >
                    <IconPrint className="h-3.5 w-3.5" />
                    Print
                  </button>
                </div>
              }
            />
          </div>

          {downloadError && (
            <p className="mt-3 text-sm text-copper">{downloadError}</p>
          )}

          <div className="mt-6">
            <ApiCardPreview card={card} />
          </div>
        </>
      )}
    </div>
  );
}
