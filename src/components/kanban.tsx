"use client";

import { useState } from "react";
import { ImageIcon, CalendarDays, GripVertical } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { QueueCard, QueueColumn } from "@/lib/types";

export function KanbanBoard({
  columns,
  cards: initialCards,
}: {
  columns: QueueColumn[];
  cards: QueueCard[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const onDrop = (columnId: string) => {
    if (dragId) {
      setCards((cs) =>
        cs.map((c) => (c.id === dragId ? { ...c, columnId } : c))
      );
    }
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto px-8 pb-8">
      {columns.map((col) => {
        const colCards = cards.filter((c) => c.columnId === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.id);
            }}
            onDrop={() => onDrop(col.id)}
            className={`flex w-72 shrink-0 flex-col rounded-[var(--radius-lg)] border bg-surface transition-colors ${
              overCol === col.id ? "border-accent" : "border-border"
            }`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: col.accent }}
                />
                <span className="text-sm font-semibold">{col.title}</span>
              </div>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted">
                {colCards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2.5 p-3">
              {colCards.map((card) => (
                <article
                  key={card.id}
                  draggable
                  onDragStart={() => setDragId(card.id)}
                  className="card-hover group cursor-grab rounded-[var(--radius-md)] border border-border bg-surface-2 p-3 active:cursor-grabbing"
                >
                  {/* Image */}
                  <div className="mb-2.5 flex h-28 items-center justify-center rounded-md border border-border bg-surface-3">
                    {card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image}
                        alt={card.teamName}
                        className="h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-7 w-7 text-muted-2" />
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">
                        {card.teamName}
                      </h3>
                      <p className="truncate text-xs text-muted">
                        {card.shirtType}
                      </p>
                    </div>
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-2 opacity-0 group-hover:opacity-100" />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-muted-2">
                      {card.orderId}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(card.dueDate)}
                    </span>
                  </div>
                </article>
              ))}

              {colCards.length === 0 && (
                <div className="rounded-[var(--radius-md)] border border-dashed border-border py-8 text-center text-xs text-muted-2">
                  ลากการ์ดมาวาง
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
