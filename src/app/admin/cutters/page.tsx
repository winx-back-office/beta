"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Card } from "@/components/ui";
import { Scissors, Check, Pencil } from "lucide-react";

interface Cutter {
  id: string;
  name: string;
  pin: string;
  active: boolean;
}

export default function CuttersPage() {
  const [cutters, setCutters] = useState<Cutter[]>([]);
  const [editing, setEditing] = useState<Record<string, Cutter>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cutters").then((r) => r.json()).then(setCutters).catch(() => {});
  }, []);

  const startEdit = (c: Cutter) => {
    setEditing((prev) => ({ ...prev, [c.id]: { ...c } }));
  };

  const saveOne = async (id: string) => {
    const updated = editing[id];
    if (!updated) return;
    setSaving(id);
    const newCutters = cutters.map((c) => (c.id === id ? updated : c));
    await fetch("/api/cutters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCutters),
    });
    setCutters(newCutters);
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setSaving(null);
  };

  return (
    <div>
      <PageHeader
        title="จัดการช่างตัด"
        subtitle="ข้อมูลและ PIN ของช่างตัดแพทเทิร์น"
      />
      <div className="px-6 py-6 max-w-2xl">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-2.5 text-left text-xs text-muted-2">ชื่อ</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted-2">PIN</th>
                <th className="px-4 py-2.5 text-left text-xs text-muted-2">สถานะ</th>
                <th className="px-4 py-2.5 text-right text-xs text-muted-2">แก้ไข</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cutters.map((c) => {
                const isEditing = !!editing[c.id];
                const draft = editing[c.id] ?? c;
                return (
                  <tr key={c.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="field-input w-40"
                          value={draft.name}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [c.id]: { ...draft, name: e.target.value } }))
                          }
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="field-input w-20 font-mono"
                          value={draft.pin}
                          maxLength={4}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [c.id]: { ...draft, pin: e.target.value } }))
                          }
                        />
                      ) : (
                        <span className="font-mono">{c.pin}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <button
                          onClick={() =>
                            setEditing((prev) => ({ ...prev, [c.id]: { ...draft, active: !draft.active } }))
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                            draft.active
                              ? "border-green-500/40 bg-green-500/15 text-green-400"
                              : "border-border bg-surface-2 text-muted"
                          }`}
                        >
                          {draft.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </button>
                      ) : (
                        <Badge tone={c.active ? "success" : "neutral"}>
                          {c.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <button
                          onClick={() => saveOne(c.id)}
                          disabled={saving === c.id}
                          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs text-accent-foreground disabled:opacity-60"
                        >
                          <Check className="h-3 w-3" /> บันทึก
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(c)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted hover:bg-surface-3 hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" /> แก้ไข
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
