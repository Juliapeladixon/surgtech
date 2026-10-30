import {
  itemsBySource,
  resolveItem,
  SOURCE_LABELS,
  SOURCE_ORDER,
  doctorFullName,
} from "../lib/catalog";
import type { CardStatus, DoctorContext, DraftCard } from "../types";

export function CardPreview({
  card,
  doctorCtx,
  status = "DRAFT",
}: {
  card: DraftCard;
  doctorCtx: DoctorContext;
  status?: CardStatus;
}) {
  const { doctor, surgeon, specialty } = doctorCtx;

  return (
    <article className="print-sheet border border-ink/20 bg-paper">
      <header className="flex items-start justify-between gap-4 border-b-2 border-ink px-5 py-4">
        <div>
          <p className="field-label">Theatre preference card</p>
          <h2 className="mt-1 font-serif text-2xl font-medium leading-tight">
            {card.procedureName || "Untitled procedure"}
          </h2>
          <p className="mt-1 text-sm text-muted">{doctor.practice_or_hospital}</p>
        </div>
        <span className="border border-line px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted">
          {status}
        </span>
      </header>

      <section className="grid gap-4 border-b border-line px-5 py-4 text-sm sm:grid-cols-3">
        <Field label="Surgeon" value={doctorFullName(doctor)} />
        <Field label="Specialty" value={specialty.name} />
        <Field label="Glove size" value={surgeon.glove_size} />
        <Field
          label="Position"
          value={card.patientPosition || "Not specified"}
        />
        <Field
          label="Anaesthesia"
          value={card.anaesthesiaType || "Not specified"}
        />
        <Field label="City" value={doctor.city || "—"} />
      </section>

      {SOURCE_ORDER.filter((source) =>
        card.selectedSources.includes(source),
      ).map((source) => {
        const rows = itemsBySource(card.items, source);
        return (
          <section key={source} className="border-b border-line px-5 py-4">
            <h3 className="field-label mb-2">{SOURCE_LABELS[source]}</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-muted">No items selected yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((item) => (
                    <tr
                      key={`${item.item_source}-${item.item_id}`}
                      className="border-b border-line/70 last:border-0"
                    >
                      <td className="py-1.5 pr-3">
                        {resolveItem(item)}
                        {item.item_notes ? (
                          <span className="text-muted"> — {item.item_notes}</span>
                        ) : null}
                      </td>
                      <td className="w-12 py-1.5 text-right tabular-nums">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      {(card.notes || surgeon.general_notes) && (
        <section className="px-5 py-4">
          <h3 className="field-label mb-2">Notes</h3>
          {card.notes && <p className="text-sm">{card.notes}</p>}
          {surgeon.general_notes && (
            <p className="mt-2 text-sm text-muted">{surgeon.general_notes}</p>
          )}
        </section>
      )}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
