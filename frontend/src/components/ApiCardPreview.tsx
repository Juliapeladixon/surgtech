import { SOURCE_LABELS, SOURCE_ORDER } from "../lib/catalog";
import type { ApiCardDetail, ApiCardItem } from "../lib/directoryApi";
import type { ItemSource } from "../types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

function itemsForSource(items: ApiCardItem[], source: ItemSource) {
  return items.filter((item) => item.item_source === source);
}

export function ApiCardPreview({ card }: { card: ApiCardDetail }) {
  return (
    <article className="print-sheet border border-ink/20 bg-paper">
      <header className="flex items-start justify-between gap-4 border-b-2 border-ink px-5 py-4">
        <div>
          <p className="field-label">Theatre preference card</p>
          <h2 className="mt-1 font-serif text-2xl font-medium leading-tight">
            {card.title || card.procedure_name || "Untitled procedure"}
          </h2>
          <p className="mt-1 text-sm text-muted">{card.specialty_name}</p>
        </div>
        <span className="border border-line px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted">
          {card.status}
        </span>
      </header>

      <section className="grid gap-4 border-b border-line px-5 py-4 text-sm sm:grid-cols-3">
        <Field label="Surgeon" value={card.surgeon_name} />
        <Field label="Specialty" value={card.specialty_name} />
        <Field
          label="Glove size"
          value={card.effective_glove_size || card.glove_size || "—"}
        />
        <Field
          label="Position"
          value={card.patient_position || "Not specified"}
        />
        <Field
          label="Anaesthesia"
          value={card.anaesthesia_type || "Not specified"}
        />
        <Field
          label="Est. minutes"
          value={
            card.estimated_minutes != null
              ? String(card.estimated_minutes)
              : "—"
          }
        />
        {card.skin_prep ? (
          <Field label="Skin prep" value={card.skin_prep} />
        ) : null}
        {card.diathermy_settings ? (
          <Field label="Diathermy" value={card.diathermy_settings} />
        ) : null}
        {card.position_aids ? (
          <Field label="Position aids" value={card.position_aids} />
        ) : null}
      </section>

      {card.notes.length > 0 && (
        <section className="border-b border-line px-5 py-4">
          <h3 className="field-label mb-2">Notes</h3>
          <ul className="space-y-2 text-sm">
            {card.notes.map((note) => (
              <li key={note.id}>
                <span className="text-[11px] uppercase tracking-wider text-copper">
                  {note.note_type}
                </span>
                <p className="mt-0.5">{note.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {SOURCE_ORDER.map((source) => {
        const rows = itemsForSource(card.items, source);
        if (rows.length === 0) return null;
        return (
          <section key={source} className="border-b border-line px-5 py-4">
            <h3 className="field-label mb-2">{SOURCE_LABELS[source]}</h3>
            <ul className="space-y-1.5 text-sm">
              {rows.map((item) => (
                <li
                  key={item.card_item_id}
                  className="flex justify-between gap-3"
                >
                  <span>
                    {item.item_label}
                    {item.item_notes ? (
                      <span className="text-muted"> — {item.item_notes}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    ×{item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </article>
  );
}
