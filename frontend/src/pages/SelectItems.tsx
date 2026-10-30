import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BackLink } from "../components/PageChrome";
import {
  nextSourceRoute,
  prevSourceRoute,
  useCardBuilder,
} from "../context/CardBuilderContext";
import {
  instrumentLabel,
  instrumentList,
  packLabel,
  packList,
  SOURCE_LABELS,
  staffPath,
  sutureLabel,
  sutureList,
} from "../lib/catalog";
import type { ItemSource } from "../types";
import { WizardShell } from "./PreferenceCardSetup";

interface CatalogRow {
  id: number;
  title: string;
  detail: string;
}

const copy: Record<
  ItemSource,
  { step: string; title: string; helper: string }
> = {
  suture: {
    step: "2 · Sutures",
    title: "Sutures",
    helper: "Tick the ties and needled sutures this case needs.",
  },
  instrument: {
    step: "Instruments",
    title: "Surgical instruments",
    helper: "Reusable instruments and positioning aids for the tray.",
  },
  pack: {
    step: "Packs",
    title: "Surgical packs",
    helper: "Trays, gown packs, bowl packs and drapes to open.",
  },
};

function rowsFor(source: ItemSource): CatalogRow[] {
  if (source === "suture") {
    return sutureList.map((s) => ({
      id: s.suture_id,
      title: sutureLabel(s),
      detail: `${s.is_absorbable ? "Absorbable" : "Non-absorbable"}${
        s.expiry_date ? ` · exp ${s.expiry_date}` : ""
      }`,
    }));
  }
  if (source === "instrument") {
    return instrumentList.map((i) => ({
      id: i.instrument_id,
      title: instrumentLabel(i),
      detail: `${i.category} · ${i.condition_status}`,
    }));
  }
  return packList.map((p) => ({
    id: p.pack_id,
    title: packLabel(p),
    detail: `${p.pack_type} · ${p.contents_description}`,
  }));
}

export function SelectItemsPage({ source }: { source: ItemSource }) {
  const { draft, setItem, setQuantity, setItemNotes } = useCardBuilder();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rowsFor(source).filter(
      (row) =>
        !q ||
        row.title.toLowerCase().includes(q) ||
        row.detail.toLowerCase().includes(q),
    );
  }, [query, source]);

  if (!draft.doctorId || !draft.procedureName.trim()) {
    return <Navigate to={staffPath("/preference-card")} replace />;
  }
  if (!draft.selectedSources.includes(source)) {
    return <Navigate to={nextSourceRoute(draft.selectedSources)} replace />;
  }

  const selectedCount = draft.items.filter((i) => i.item_source === source)
    .length;

  const backTo = prevSourceRoute(draft.selectedSources, source);

  return (
    <>
      <BackLink to={backTo} className="mb-4">
        {backTo.includes("/preference-card/") &&
        !backTo.endsWith("/preference-card")
          ? "Back to previous list"
          : "Back to setup"}
      </BackLink>
      <WizardShell title={copy[source].title} step={copy[source].step}>
      <p className="text-sm text-muted">{copy[source].helper}</p>
      <input
        className="mt-4 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        placeholder={`Search ${SOURCE_LABELS[source].toLowerCase()}…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="mt-2 text-xs text-muted">{selectedCount} selected</p>

      <ul className="mt-4 max-h-[28rem] space-y-2 overflow-auto pr-1">
        {rows.map((row) => {
          const current = draft.items.find(
            (i) => i.item_source === source && i.item_id === row.id,
          );
          return (
            <li
              key={row.id}
              className={`rounded-sm border px-3 py-3 ${
                current ? "border-teal bg-paper" : "border-line bg-white/40"
              }`}
            >
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(current)}
                  onChange={(e) =>
                    setItem(
                      {
                        item_source: source,
                        item_id: row.id,
                        quantity: 1,
                        item_notes: "",
                      },
                      e.target.checked,
                    )
                  }
                />
                <span>
                  <span className="block text-sm font-medium">{row.title}</span>
                  <span className="block text-xs text-muted">{row.detail}</span>
                </span>
              </label>
              {current && (
                <div className="mt-3 ml-7 grid gap-2 sm:grid-cols-[7rem_1fr]">
                  <label className="text-xs text-muted">
                    Quantity
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-md border border-line px-2 py-1 text-sm"
                      value={current.quantity}
                      onChange={(e) =>
                        setQuantity(source, row.id, Number(e.target.value) || 1)
                      }
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Item note
                    <input
                      className="mt-1 w-full rounded-md border border-line px-2 py-1 text-sm"
                      value={current.item_notes}
                      placeholder="e.g. colts, for chest drain"
                      onChange={(e) =>
                        setItemNotes(source, row.id, e.target.value)
                      }
                    />
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <BackLink
          to={backTo}
          className="rounded-md border border-line px-4 py-2 text-sm text-ink hover:bg-linen hover:text-ink"
        >
          Back
        </BackLink>
        <button
          className="rounded-md bg-scrub px-4 py-2 text-sm text-white hover:bg-scrub-deep"
          onClick={() => navigate(nextSourceRoute(draft.selectedSources, source))}
        >
          Continue
        </button>
      </div>
      </WizardShell>
    </>
  );
}
