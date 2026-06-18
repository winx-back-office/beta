"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Card } from "@/components/ui";
import { Check, Pencil, Plus, X, Building2 } from "lucide-react";

interface Sewer {
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

function bankKey(id: string) { return `winx-bank-sewer-${id}`; }

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

export default function SewersPage() {
  const [sewers, setSewers] = useState<Sewer[]>([]);
  const [editing, setEditing] = useState<Record<string, Sewer>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetch("/api/sewers").then((r) => r.json()).then(setSewers).catch(() => {});
  }, []);

  const startEdit = (s: Sewer) => setEditing((prev) => ({ ...prev, [s.id]: { ...s } }));

  const saveOne = async (id: string) => {
    const updated = editing[id];
    if (!updated) return;
    setSaving(id);
    await fetch("/api/sewers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([updated]),
    });
    setSewers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setSaving(null);
  };

  const addSewer = async () => {
    if (!newName.trim()) return setAddError("กรุณาใส่ชื่อ");
    if (newPin.length !== 4) return setAddError("PIN ต้องเป็น 4 หลัก");
    setAddError("");
    const res = await fetch("/api/sewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), pin: newPin }),
    });
    const data = await res.json();
    if (data.error) return setAddError(data.error);
    setSewers((prev) => [...prev, data]);
    setNewName(""); setNewPin(""); setAdding(false);
  };

  return (
    <div>
      <PageHeader
        title="จัดการช่างเย็บ"
        subtitle="ข้อมูลและ PIN ของช่างเย็บ"
        action={
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> เพิ่มช่างเย็บ
          </button>
        }
      />
      <div className="px-6 py-6 max-w-3xl space-y-4">
        {adding && (
          <Card className="p-4 space-y-3">
            <div className="font-semibold text-sm">เพิ่มช่างเย็บใหม่</div>
            <div className="flex gap-3">
              <input className="field-input flex-1" placeholder="ชื่อ" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="field-input w-24 font-mono" placeholder="PIN" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            </div>
            {addError && <div className="text-xs text-red-400">{addError}</div>}
            <div className="flex gap-2">
              <button onClick={addSewer} className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs text-accent-foreground">
                <Check className="h-3 w-3" /> บันทึก
              </button>
              <button onClick={() => { setAdding(false); setAddError(""); }} className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-muted hover:bg-surface-2">
                <X className="h-3 w-3" /> ยกเลิก
              </button>
            </div>
          </Card>
        )}

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
              {sewers.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-2">ยังไม่มีช่างเย็บ</td></tr>
              )}
              {sewers.map((s) => {
                const isEditing = !!editing[s.id];
                const draft = editing[s.id] ?? s;
                return (
                  <tr key={s.id} className={isEditing ? "bg-surface-2" : "hover:bg-surface-2"}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <>
                          <input
                            className="field-input w-48"
                            value={draft.name}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [s.id]: { ...draft, name: e.target.value } }))}
                          />
                          <BankInfoRow id={s.id} editing={true} />
                        </>
                      ) : (
                        <>
                          <div className="font-medium">{s.name}</div>
                          <BankInfoRow id={s.id} editing={false} />
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top pt-4">
                      {isEditing ? (
                        <input className="field-input w-20 font-mono" value={draft.pin} maxLength={4}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [s.id]: { ...draft, pin: e.target.value } }))} />
                      ) : <span className="font-mono">{s.pin}</span>}
                    </td>
                    <td className="px-4 py-3 align-top pt-4">
                      {isEditing ? (
                        <button
                          onClick={() => setEditing((prev) => ({ ...prev, [s.id]: { ...draft, active: !draft.active } }))}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${draft.active ? "border-green-500/40 bg-green-500/15 text-green-400" : "border-border bg-surface-2 text-muted"}`}
                        >
                          {draft.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </button>
                      ) : <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "ใช้งาน" : "ไม่ใช้งาน"}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right align-top pt-4">
                      {isEditing ? (
                        <button onClick={() => saveOne(s.id)} disabled={saving === s.id}
                          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs text-accent-foreground disabled:opacity-60">
                          <Check className="h-3 w-3" /> บันทึก
                        </button>
                      ) : (
                        <button onClick={() => startEdit(s)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted hover:bg-surface-3 hover:text-foreground">
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
