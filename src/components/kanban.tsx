"use client";

import { useState } from "react";
import { ImageIcon, CalendarDays, GripVertical, X, FileSpreadsheet, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { QueueCard, QueueColumn } from "@/lib/types";
import Link from "next/link";

export function KanbanBoard({
  columns,
  cards: initialCards,
  onCardMove,
  onAddCard,
  onColumnsChange,
}: {
  columns: QueueColumn[];
  cards: QueueCard[];
  onCardMove?: (cardId: string, newColumnId: string) => void;
  onAddCard?: (columnId: string) => void;
  onColumnsChange?: (cols: QueueColumn[]) => void;
}) {
  const [cards, setCards] = useState(initialCards);
  const [cols, setCols] = useState(columns);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [overColTarget, setOverColTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<QueueCard | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState("");
  const [colorPickerColId, setColorPickerColId] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  const ACCENT_OPTIONS = [
    "var(--accent)", "var(--info)", "var(--warn)", "var(--success)", "#a855f7", "#ec4899", "#f97316",
  ];
  const [newColAccent, setNewColAccent] = useState(ACCENT_OPTIONS[0]);

  const updateCols = (next: typeof cols | ((prev: typeof cols) => typeof cols)) => {
    setCols(prev => {
      const result = typeof next === "function" ? next(prev) : next;
      onColumnsChange?.(result);
      return result;
    });
  };

  const onDrop = (columnId: string) => {
    if (dragColId) {
      // reorder columns
      updateCols((cs) => {
        const from = cs.findIndex(c => c.id === dragColId);
        const to = cs.findIndex(c => c.id === columnId);
        if (from === -1 || to === -1 || from === to) return cs;
        const next = [...cs];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      setDragColId(null);
      setOverColTarget(null);
      return;
    }
    if (dragId) {
      setCards((cs) =>
        cs.map((c) => (c.id === dragId ? { ...c, columnId } : c))
      );
      onCardMove?.(dragId, columnId);
    }
    setDragId(null);
    setOverCol(null);
  };

  const currentColumn = columns.find((c) => c.id === selected?.columnId);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-8 pb-8">
        {cols.map((col) => {
          const colCards = cards.filter((c) => c.columnId === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragColId) setOverColTarget(col.id);
                else setOverCol(col.id);
              }}
              onDrop={() => onDrop(col.id)}
              className={`flex w-72 shrink-0 flex-col rounded-[var(--radius-lg)] border bg-surface transition-all ${
                overColTarget === col.id && dragColId ? "border-accent scale-[1.02]" :
                overCol === col.id ? "border-accent" : "border-border"
              }`}
            >
              {/* Column header — draggable */}
              <div
                draggable
                onDragStart={(e) => { e.stopPropagation(); setDragColId(col.id); setDragId(null); }}
                onDragEnd={() => { setDragColId(null); setOverColTarget(null); }}
                className="flex cursor-grab items-center justify-between border-b border-border px-4 py-3 active:cursor-grabbing"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <span
                      className="block h-2.5 w-2.5 cursor-pointer rounded-full hover:ring-2 hover:ring-white/40"
                      style={{ background: col.accent }}
                      onClick={e => { e.stopPropagation(); setColorPickerColId(colorPickerColId === col.id ? null : col.id); }}
                      title="คลิกเพื่อเปลี่ยนสี"
                    />
                    {colorPickerColId === col.id && (
                      <div
                        className="absolute left-0 top-5 z-20 flex gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface p-2 shadow-xl"
                        onClick={e => e.stopPropagation()}
                      >
                        {ACCENT_OPTIONS.map(a => (
                          <button
                            key={a}
                            onClick={() => {
                              updateCols(cs => cs.map(c => c.id === col.id ? { ...c, accent: a } : c));
                              setColorPickerColId(null);
                            }}
                            className={`h-4 w-4 rounded-full border-2 transition-transform hover:scale-125 ${col.accent === a ? "border-white scale-125" : "border-transparent"}`}
                            style={{ background: a }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {editingColId === col.id ? (
                    <input
                      autoFocus
                      value={editingColTitle}
                      onChange={e => setEditingColTitle(e.target.value)}
                      onBlur={() => {
                        if (editingColTitle.trim()) {
                          updateCols(cs => cs.map(c => c.id === col.id ? { ...c, title: editingColTitle.trim() } : c));
                        }
                        setEditingColId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") { setEditingColId(null); }
                      }}
                      className="w-full rounded bg-surface-3 px-2 py-0.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-accent"
                    />
                  ) : (
                    <span
                      className="text-sm font-semibold cursor-default select-none"
                      onDoubleClick={() => { setEditingColId(col.id); setEditingColTitle(col.title); }}
                      title="ดับเบิ้ลคลิกเพื่อแก้ไข"
                    >
                      {col.title}
                    </span>
                  )}
                </div>
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-muted shrink-0">
                  {colCards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-1 flex-col gap-2.5 p-3">
                {colCards.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); setDragId(card.id); }}
                    onClick={() => setSelected(card)}
                    className="card-hover group cursor-pointer rounded-[var(--radius-md)] border border-border bg-surface-2 p-3 active:cursor-grabbing"
                  >
                    {/* Image */}
                    <div className="mb-2.5 flex h-28 items-center justify-center rounded-md border border-border bg-surface-3 overflow-hidden">
                      {card.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.image}
                          alt={card.teamName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-7 w-7 text-muted-2" />
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{card.teamName}</h3>
                        <p className="truncate text-xs text-muted">{card.shirtType}</p>
                      </div>
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-2 opacity-0 group-hover:opacity-100" />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted-2">{card.orderId}</span>
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

                {onAddCard && (
                  <button
                    onClick={() => onAddCard(col.id)}
                    className="flex w-full items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-xs text-muted-2 hover:bg-surface-2 hover:text-muted transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    เพิ่มงาน
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add column */}
        {addingCol ? (
          <div className="flex w-72 shrink-0 flex-col rounded-[var(--radius-lg)] border border-accent bg-surface p-4 gap-3">
            <input
              autoFocus
              value={newColTitle}
              onChange={e => setNewColTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newColTitle.trim()) {
                  updateCols(cs => [...cs, { id: `col_${Date.now()}`, title: newColTitle.trim(), accent: newColAccent }]);
                  setNewColTitle(""); setAddingCol(false);
                }
                if (e.key === "Escape") { setAddingCol(false); setNewColTitle(""); }
              }}
              placeholder="ชื่อสถานะ..."
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              {ACCENT_OPTIONS.map(a => (
                <button
                  key={a}
                  onClick={() => setNewColAccent(a)}
                  className={`h-5 w-5 rounded-full border-2 transition-transform ${newColAccent === a ? "scale-125 border-white" : "border-transparent"}`}
                  style={{ background: a }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setAddingCol(false); setNewColTitle(""); }}
                className="flex-1 rounded-md border border-border py-1.5 text-xs text-muted hover:bg-surface-2"
              >
                ยกเลิก
              </button>
              <button
                disabled={!newColTitle.trim()}
                onClick={() => {
                  if (!newColTitle.trim()) return;
                  updateCols(cs => [...cs, { id: `col_${Date.now()}`, title: newColTitle.trim(), accent: newColAccent }]);
                  setNewColTitle(""); setAddingCol(false);
                }}
                className="flex-1 rounded-md bg-accent py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-40"
              >
                เพิ่ม
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCol(true)}
            className="flex h-12 w-56 shrink-0 items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border px-4 text-sm text-muted hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="h-4 w-4" />
            เพิ่มสถานะใหม่
          </button>
        )}
      </div>

      {/* Card detail popup */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-96 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative flex h-52 items-center justify-center bg-surface-3">
              {selected.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.image} alt={selected.teamName} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-12 w-12 text-muted-2" />
              )}
              <button
                onClick={() => setSelected(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
              {/* status badge */}
              {currentColumn && (
                <span
                  className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-black"
                  style={{ background: currentColumn.accent }}
                >
                  {currentColumn.title}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-5">
              <h2 className="text-lg font-bold">{selected.teamName}</h2>
              <p className="mt-0.5 text-sm text-muted">{selected.shirtType}</p>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-2">รหัสออเดอร์</dt>
                  <dd className="font-mono font-medium">{selected.orderId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-2">วันที่เริ่ม</dt>
                  <dd className="font-medium">{formatDate(selected.dueDate)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex gap-2">
                <Link href={`/orders/${selected.orderId}`} className="flex-1">
                  <button className="w-full rounded-[var(--radius-md)] border border-border py-2 text-sm hover:bg-surface-2">
                    ดูออเดอร์
                  </button>
                </Link>
                <Link href={`/production-tables/${selected.orderId}`} className="flex-1">
                  <button className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent py-2 text-sm font-semibold text-accent-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    เปิดตารางผลิต
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
