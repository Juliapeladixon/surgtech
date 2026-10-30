import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CardItem, DraftCard, ItemSource, SavedCard } from "../types";
import {
  clearDraft,
  emptyDraft,
  readCards,
  readDraft,
  writeCards,
  writeDraft,
} from "../lib/storage";
import { staffPath } from "../lib/catalog";
import { useDirectory } from "./DirectoryContext";

interface CardBuilderValue {
  draft: DraftCard;
  cards: SavedCard[];
  updateDraft: (patch: Partial<DraftCard>) => void;
  resetDraft: () => void;
  loadCard: (card: SavedCard) => void;
  toggleSource: (source: ItemSource) => void;
  setItem: (item: CardItem, selected: boolean) => void;
  setQuantity: (source: ItemSource, itemId: number, quantity: number) => void;
  setItemNotes: (source: ItemSource, itemId: number, notes: string) => void;
  saveCard: () => SavedCard;
}

const CardBuilderContext = createContext<CardBuilderValue | null>(null);

export function CardBuilderProvider({ children }: { children: ReactNode }) {
  const { getSurgeonByDoctor, refreshCards } = useDirectory();
  const [draft, setDraft] = useState<DraftCard>(readDraft);
  const [cards, setCards] = useState<SavedCard[]>(readCards);

  const commitDraft = (next: DraftCard) => {
    setDraft(next);
    writeDraft(next);
  };

  const value = useMemo<CardBuilderValue>(
    () => ({
      draft,
      cards,
      updateDraft: (patch) => commitDraft({ ...draft, ...patch }),
      resetDraft: () => {
        clearDraft();
        setDraft(emptyDraft());
      },
      loadCard: (card) => {
        commitDraft({
          doctorId: card.doctorId,
          procedureName: card.procedureName,
          procedureId: card.procedureId,
          patientPosition: card.patientPosition,
          anaesthesiaType: card.anaesthesiaType,
          selectedSources: card.selectedSources,
          items: card.items,
          notes: card.notes,
        });
      },
      toggleSource: (source) => {
        const selected = draft.selectedSources.includes(source)
          ? draft.selectedSources.filter((s) => s !== source)
          : [...draft.selectedSources, source];
        const items = draft.selectedSources.includes(source)
          ? draft.items.filter((i) => i.item_source !== source)
          : draft.items;
        commitDraft({ ...draft, selectedSources: selected, items });
      },
      setItem: (item, selected) => {
        const without = draft.items.filter(
          (i) =>
            !(i.item_source === item.item_source && i.item_id === item.item_id),
        );
        commitDraft({
          ...draft,
          items: selected ? [...without, item] : without,
        });
      },
      setQuantity: (source, itemId, quantity) => {
        commitDraft({
          ...draft,
          items: draft.items.map((i) =>
            i.item_source === source && i.item_id === itemId
              ? { ...i, quantity: Math.max(1, quantity) }
              : i,
          ),
        });
      },
      setItemNotes: (source, itemId, notes) => {
        commitDraft({
          ...draft,
          items: draft.items.map((i) =>
            i.item_source === source && i.item_id === itemId
              ? { ...i, item_notes: notes }
              : i,
          ),
        });
      },
      saveCard: () => {
        if (!draft.doctorId) {
          throw new Error("Select a doctor before saving the card.");
        }
        const surgeon = getSurgeonByDoctor(draft.doctorId);
        if (!surgeon) {
          throw new Error("This doctor has no surgeon record.");
        }
        const saved: SavedCard = {
          procedureName: draft.procedureName,
          procedureId: draft.procedureId,
          patientPosition: draft.patientPosition,
          anaesthesiaType: draft.anaesthesiaType,
          selectedSources: draft.selectedSources,
          items: draft.items,
          notes: draft.notes,
          id: crypto.randomUUID(),
          doctorId: draft.doctorId,
          surgeonId: surgeon.id,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };
        const next = [saved, ...readCards().filter((c) => c.id !== saved.id)];
        writeCards(next);
        setCards(next);
        refreshCards();
        return saved;
      },
    }),
    [cards, draft, getSurgeonByDoctor, refreshCards],
  );

  return (
    <CardBuilderContext.Provider value={value}>
      {children}
    </CardBuilderContext.Provider>
  );
}

export function useCardBuilder() {
  const ctx = useContext(CardBuilderContext);
  if (!ctx) {
    throw new Error("useCardBuilder must be used inside CardBuilderProvider");
  }
  return ctx;
}

export function nextSourceRoute(selected: ItemSource[], current?: ItemSource) {
  const order: ItemSource[] = ["suture", "instrument", "pack"];
  const remaining = order.filter((s) => selected.includes(s));
  if (!current) {
    return remaining[0]
      ? sourcePath(remaining[0])
      : staffPath("/preference-card/preview");
  }
  const idx = remaining.indexOf(current);
  const next = remaining[idx + 1];
  return next ? sourcePath(next) : staffPath("/preference-card/preview");
}

export function prevSourceRoute(selected: ItemSource[], current: ItemSource) {
  const order: ItemSource[] = ["suture", "instrument", "pack"];
  const remaining = order.filter((s) => selected.includes(s));
  const idx = remaining.indexOf(current);
  const prev = remaining[idx - 1];
  return prev ? sourcePath(prev) : staffPath("/preference-card");
}

export function lastSourceRoute(selected: ItemSource[]) {
  const order: ItemSource[] = ["suture", "instrument", "pack"];
  const remaining = order.filter((s) => selected.includes(s));
  const last = remaining[remaining.length - 1];
  return last ? sourcePath(last) : staffPath("/preference-card");
}

export function sourcePath(source: ItemSource) {
  if (source === "suture") return staffPath("/preference-card/sutures");
  if (source === "instrument") return staffPath("/preference-card/instruments");
  return staffPath("/preference-card/packs");
}
