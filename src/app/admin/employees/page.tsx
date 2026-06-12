"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";

// ===== Types =====
interface Employee { id: string; name: string; allowedMenus: string[]; isActive: boolean; }
interface Cutter { id: string; name: string; pin: string; active: boolean; }
interface Sewer { id: string; name: string; pin: string; active: boolean; }

const MENUS = [
  { key: "overview", label: "ภาพรวมการเงิน" },
  { key: "summary", label: "สรุปภาพรวมงาน" },
  { key: "orders", label: "รายการออเดอร์" },
  { key: "queue", label: "คิวออกแบบ / คิวผลิต" },
  { key: "production-tables", label: "ตารางสั่งผลิต" },
  { key: "cutting-jobs", label: "ใบงานตัด-เย็บ" },
  { key: "delivery-notes", label: "ใบส่งสินค้า" },
];

// ===== Shared PIN Input =====
function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="PIN 6 หลัก"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-9 text-sm outline-none focus:border-accent"
      />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ===== Employee helpers =====
function MenuCheckboxes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {MENUS.map((m) => (
        <label key={m.key} className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => onChange(value.includes(m.key) ? value.filter((k) => k !== m.key) : [...value, m.key])}
            className={cn("h-4 w-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer",
              value.includes(m.key) ? "bg-accent border-accent" : "border-border")}
          >
            {value.includes(m.key) && <Check className="h-2.5 w-2.5 text-accent-foreground" strokeWidth={3} />}
          </div>
          <span className="text-sm">{m.label}</span>
        </label>
      ))}
    </div>
  );
}

type FormState = { name: string; pin: string; allowedMenus: string[] };

function EmployeeForm({ initial, onSave, onCancel, isEdit }: {
  initial: FormState; onSave: (f: FormState) => Promise<void>; onCancel: () => void; isEdit: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const handleSave = async () => {
    if (!form.name.trim()) { setErr("ใส่ชื่อพนักงาน"); return; }
    if (!isEdit && form.pin.length !== 6) { setErr("PIN ต้องมี 6 หลัก"); return; }
    if (isEdit && form.pin && form.pin.length !== 6) { setErr("PIN ต้องมี 6 หลัก"); return; }
    setSaving(true);
    try { await onSave(form); } catch (e) { setErr(String(e)); } finally { setSaving(false); }
  };
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-2">ชื่อพนักงาน</label>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="เช่น น้องบีม"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-2">
          PIN {isEdit && <span className="text-muted-2">(เว้นว่างถ้าไม่ต้องการเปลี่ยน)</span>}
        </label>
        <PinInput value={form.pin} onChange={(v) => setForm((f) => ({ ...f, pin: v }))} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-2">เมนูที่ใช้งานได้</label>
        <MenuCheckboxes value={form.allowedMenus} onChange={(v) => setForm((f) => ({ ...f, allowedMenus: v }))} />
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50">
          <Check className="h-4 w-4" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2">ยกเลิก</button>
      </div>
    </div>
  );
}

// ===== Cutters Tab =====
function CuttersTab() {
  const [cutters, setCutters] = useState<Cutter[]>([]);
  const [editing, setEditing] = useState<Record<string, Cutter>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetch("/api/cutters").then((r) => r.json()).then(setCutters).catch(() => {});
  }, []);

  const startEdit = (c: Cutter) => setEditing((prev) => ({ ...prev, [c.id]: { ...c } }));
  const saveOne = async (id: string) => {
    const updated = editing[id];
    if (!updated) return;
    setSaving(id);
    const newCutters = cutters.map((c) => (c.id === id ? updated : c));
    await fetch("/api/cutters", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCutters) });
    setCutters(newCutters);
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setSaving(null);
  };
  const addCutter = async () => {
    if (!newName.trim()) return setAddError("กรุณาใส่ชื่อ");
    if (newPin.length !== 4) return setAddError("PIN ต้องเป็น 4 หลัก");
    setAddError("");
    const res = await fetch("/api/cutters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), pin: newPin }) });
    const data = await res.json();
    if (data.error) return setAddError(data.error);
    setCutters((prev) => [...prev, data]);
    setNewName(""); setNewPin(""); setAdding(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-2">ข้อมูลและ PIN ของช่างตัดแพทเทิร์น</p>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> เพิ่มช่างตัด
          </button>
        )}
      </div>
      {adding && (
        <Card className="p-4 space-y-3">
          <div className="font-semibold text-sm">เพิ่มช่างตัดใหม่</div>
          <div className="flex gap-3">
            <input className="field-input flex-1" placeholder="ชื่อ" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="field-input w-24 font-mono" placeholder="PIN" maxLength={4} value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
          {addError && <div className="text-xs text-red-400">{addError}</div>}
          <div className="flex gap-2">
            <button onClick={addCutter} className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs text-accent-foreground">
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
              <th className="px-4 py-2.5 text-left text-xs text-muted-2">ชื่อ</th>
              <th className="px-4 py-2.5 text-left text-xs text-muted-2">PIN</th>
              <th className="px-4 py-2.5 text-left text-xs text-muted-2">สถานะ</th>
              <th className="px-4 py-2.5 text-right text-xs text-muted-2">แก้ไข</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cutters.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-2">ยังไม่มีข้อมูลช่างตัด</td></tr>
            )}
            {cutters.map((c) => {
              const isEditing = !!editing[c.id];
              const draft = editing[c.id] ?? c;
              return (
                <tr key={c.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input className="field-input w-40" value={draft.name}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...draft, name: e.target.value } }))} />
                    ) : c.name}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input className="field-input w-20 font-mono" value={draft.pin} maxLength={4}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...draft, pin: e.target.value } }))} />
                    ) : <span className="font-mono">{c.pin}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <button
                        onClick={() => setEditing((prev) => ({ ...prev, [c.id]: { ...draft, active: !draft.active } }))}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${draft.active ? "border-green-500/40 bg-green-500/15 text-green-400" : "border-border bg-surface-2 text-muted"}`}>
                        {draft.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </button>
                    ) : <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "ใช้งาน" : "ไม่ใช้งาน"}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <button onClick={() => saveOne(c.id)} disabled={saving === c.id}
                        className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs text-accent-foreground disabled:opacity-60">
                        <Check className="h-3 w-3" /> บันทึก
                      </button>
                    ) : (
                      <button onClick={() => startEdit(c)}
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
  );
}

// ===== Sewers Tab =====
function SewersTab() {
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
    await fetch("/api/sewers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify([updated]) });
    setSewers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setSaving(null);
  };
  const addSewer = async () => {
    if (!newName.trim()) return setAddError("กรุณาใส่ชื่อ");
    if (newPin.length !== 4) return setAddError("PIN ต้องเป็น 4 หลัก");
    setAddError("");
    const res = await fetch("/api/sewers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), pin: newPin }) });
    const data = await res.json();
    if (data.error) return setAddError(data.error);
    setSewers((prev) => [...prev, data]);
    setNewName(""); setNewPin(""); setAdding(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-2">ข้อมูลและ PIN ของช่างเย็บ</p>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> เพิ่มช่างเย็บ
          </button>
        )}
      </div>
      {adding && (
        <Card className="p-4 space-y-3">
          <div className="font-semibold text-sm">เพิ่มช่างเย็บใหม่</div>
          <div className="flex gap-3">
            <input className="field-input flex-1" placeholder="ชื่อ" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="field-input w-24 font-mono" placeholder="PIN" maxLength={4} value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
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
              <th className="px-4 py-2.5 text-left text-xs text-muted-2">ชื่อ</th>
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
                <tr key={s.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input className="field-input w-40" value={draft.name}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [s.id]: { ...draft, name: e.target.value } }))} />
                    ) : s.name}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input className="field-input w-20 font-mono" value={draft.pin} maxLength={4}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [s.id]: { ...draft, pin: e.target.value } }))} />
                    ) : <span className="font-mono">{s.pin}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <button
                        onClick={() => setEditing((prev) => ({ ...prev, [s.id]: { ...draft, active: !draft.active } }))}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${draft.active ? "border-green-500/40 bg-green-500/15 text-green-400" : "border-border bg-surface-2 text-muted"}`}>
                        {draft.active ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </button>
                    ) : <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "ใช้งาน" : "ไม่ใช้งาน"}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
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
  );
}

// ===== Main Page =====
type Tab = "employees" | "cutters" | "sewers";

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { if (user && user.role !== "admin") router.replace("/"); }, [user, router]);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/employees").then((r) => r.json()).then(setEmployees).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form: FormState) => {
    const res = await fetch("/api/admin/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    setAdding(false); load();
  };

  const handleEdit = async (id: string, form: FormState) => {
    const body: Record<string, unknown> = { name: form.name, allowedMenus: form.allowedMenus };
    if (form.pin) body.pin = form.pin;
    const res = await fetch(`/api/admin/employees/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    setEditId(null); load();
  };

  const handleToggle = async (emp: Employee) => {
    await fetch(`/api/admin/employees/${emp.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !emp.isActive }) });
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
    setDeleteId(null); load();
  };

  if (user?.role !== "admin") return null;

  const TABS: { key: Tab; label: string }[] = [
    { key: "employees", label: "พนักงาน" },
    { key: "cutters", label: "ช่างตัด" },
    { key: "sewers", label: "ช่างเย็บ" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">จัดการพนักงาน</h1>
          <p className="text-sm text-muted-2">กำหนด PIN และสิทธิ์การใช้งาน</p>
        </div>
        {tab === "employees" && !adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> เพิ่มพนักงาน
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-surface text-foreground shadow-sm" : "text-muted-2 hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "employees" && (
        <>
          {adding && (
            <div className="mb-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold">เพิ่มพนักงานใหม่</h2>
              <EmployeeForm initial={{ name: "", pin: "", allowedMenus: [] }} onSave={handleAdd} onCancel={() => setAdding(false)} isEdit={false} />
            </div>
          )}
          <div className="mb-4"><AdminPinCard /></div>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-2">กำลังโหลด...</div>
          ) : employees.length === 0 && !adding ? (
            <div className="py-12 text-center text-sm text-muted-2">ยังไม่มีพนักงาน</div>
          ) : (
            <div className="flex flex-col gap-3">
              {employees.map((emp) => (
                <div key={emp.id} className={cn("rounded-xl border bg-surface p-4 shadow-sm transition-opacity", !emp.isActive && "opacity-50")}>
                  {editId === emp.id ? (
                    <>
                      <h3 className="mb-4 text-sm font-semibold">แก้ไข {emp.name}</h3>
                      <EmployeeForm initial={{ name: emp.name, pin: "", allowedMenus: emp.allowedMenus }}
                        onSave={(f) => handleEdit(emp.id, f)} onCancel={() => setEditId(null)} isEdit />
                    </>
                  ) : deleteId === emp.id ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm">ลบ <strong>{emp.name}</strong> ออกจากระบบ?</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(emp.id)}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">ยืนยันลบ</button>
                        <button onClick={() => setDeleteId(null)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-surface-2">ยกเลิก</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{emp.name}</span>
                          {!emp.isActive && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted-2">ระงับ</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {emp.allowedMenus.length === 0 ? (
                            <span className="text-xs text-muted-2">ไม่มีสิทธิ์</span>
                          ) : (
                            emp.allowedMenus.map((k) => (
                              <span key={k} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent font-medium">
                                {MENUS.find((m) => m.key === k)?.label ?? k}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => handleToggle(emp)} title={emp.isActive ? "ระงับ" : "เปิดใช้"}
                          className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
                          {emp.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setEditId(emp.id)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(emp.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-surface-2">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "cutters" && <CuttersTab />}
      {tab === "sewers" && <SewersTab />}
    </div>
  );
}

function AdminPinCard() {
  const [open, setOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSave = async () => {
    if (newPin.length !== 6) { setMsg({ type: "err", text: "PIN ใหม่ต้องมี 6 หลัก" }); return; }
    if (newPin !== confirmPin) { setMsg({ type: "err", text: "PIN ใหม่ไม่ตรงกัน" }); return; }
    setSaving(true); setMsg(null);
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPin, newPin }) });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ type: "err", text: json.error }); return; }
    setMsg({ type: "ok", text: "เปลี่ยน PIN สำเร็จ" });
    setCurrentPin(""); setNewPin(""); setConfirmPin("");
    setTimeout(() => { setOpen(false); setMsg(null); }, 1500);
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">Admin</span>
        <button onClick={() => { setOpen((o) => !o); setMsg(null); }}
          className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs hover:bg-surface-2">
          <Pencil className="h-3 w-3" /> เปลี่ยน PIN
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-2">เข้าถึงได้ทุกเมนู</p>
      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-2">PIN ปัจจุบัน</label>
            <PinInput value={currentPin} onChange={setCurrentPin} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-2">PIN ใหม่</label>
            <PinInput value={newPin} onChange={setNewPin} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-2">ยืนยัน PIN ใหม่</label>
            <PinInput value={confirmPin} onChange={setConfirmPin} />
          </div>
          {msg && <p className={`text-xs ${msg.type === "ok" ? "text-green-500" : "text-red-500"}`}>{msg.text}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50">
              <Check className="h-4 w-4" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button onClick={() => { setOpen(false); setMsg(null); }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2">ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
}
