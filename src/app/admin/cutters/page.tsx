"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Card } from "@/components/ui";
import { Scissors, Check, Pencil, Building2 } from "lucide-react";

interface Cutter {
  id: string;
  name: string;
  pin: string;
  active: boolean;
}

interface BankInfo {
  accountNumber: string;
  bankName: string;
  accountName: string;
}

function bankKey(id: string) { return `winx-bank-cutter-${id}`; }

function getBankInfo(id: string): BankInfo {
  if (typeof window === "undefined") return { accountNumber: "", bankName: "", accountName: "" };
  const v = localStorage.getItem(bankKey(id));
  return v ? JSON.parse(v) : { accountNumber: "", bankName: "", accountName: "" };
}

function saveBankInfo(id: string, info: BankInfo) {
  localStorage.setItem(bankKey(id), JSON.stringify(info));
}

const BANKS = [
  "กรุงเทพ (BBL)", "กสิกรไทย (KBANK)", "ไทยพาณิชย์ (SCB)",
  "กรุงไทย (KTB)", "กรุงศรี (BAY)", "ทหารไทยธนชาต (TTB)",
  "ออมสิน", "ธ.ก.ส.", "ซิตี้แบงก์", "ยูโอบี (UOB)",
];

function BankInfoRow({ id, editing }: { id: string; editing: boolean }) {
  const [info, setInfo] = useState<BankInfo>(() => getBankInfo(id));

  if (!editing) {
    const hasBank = info.accountNumber || info.bankName;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-2">
        <Building2 className="h-3 w-3 shrink-0" />
        {hasBank ? (
          <span>{info.bankName} {info.accountNumber}</span>
        ) : (
          <span className="italic">ยังไม่กำหนด</span>
        )}
      </div>
    );
  }

  const update = (field: keyof BankInfo, val: string) => {
    const next = { ...info, [field]: val };
    setInfo(next);
    saveBankInfo(id, next);
  };

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      <div>
        <div className="mb-1 text-[10px] text-muted-2">เลขบัญชี</div>
        <input
          className="field-input font-mono"
          placeholder="xxx-x-xxxxx-x"
          value={info.accountNumber}
          onChange={(e) => update("accountNumber", e.target.value)}
        />
      </div>
      <div>
        <div className="mb-1 text-[10px] text-muted-2">ธนาคาร</div>
        <select
          className="field-input"
          value={info.bankName}
          onChange={(e) => update("bankName", e.target.value)}
        >
          <option value="">— เลือกธนาคาร —</option>
          {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <div className="mb-1 text-[10px] text-muted-2">ชื่อ-นามสกุล (บัญชี)</div>
        <input
          className="field-input"
          placeholder="ชื่อเจ้าของบัญชี"
          value={info.accountName}
          onChange={(e) => update("accountName", e.target.value)}
        />
      </div>
    </div>
  );
}

export default function CuttersPage() {
  const [cutters, setCutters] = useState<Cutter[]>([]);
  const [editing, setEditing] = useState<Record<string, Cutter>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cutters").then((r) => r.json()).then(setCutters).catch(() => {});
  }, []);

  const startEdit = (c: Cutter) => setEditing((prev) => ({ ...prev, [c.id]: { ...c } }));

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
      <div className="px-6 py-6 max-w-3xl">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-2.5 text-left text-xs text-muted-2">ชื่อ / ข้อมูลบัญชี</th>
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
                  <tr key={c.id} className={isEditing ? "bg-surface-2" : "hover:bg-surface-2"}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <>
                          <input
                            className="field-input w-48"
                            value={draft.name}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [c.id]: { ...draft, name: e.target.value } }))
                            }
                          />
                          <BankInfoRow id={c.id} editing={true} />
                        </>
                      ) : (
                        <>
                          <div className="font-medium">{c.name}</div>
                          <BankInfoRow id={c.id} editing={false} />
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top pt-4">
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
                    <td className="px-4 py-3 align-top pt-4">
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
                    <td className="px-4 py-3 text-right align-top pt-4">
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
