"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  allowedMenus: string[];
  isActive: boolean;
}

const MENUS = [
  { key: "overview", label: "ภาพรวม" },
  { key: "orders", label: "รายการออเดอร์" },
  { key: "queue", label: "คิวออกแบบ / คิวผลิต" },
  { key: "production-tables", label: "ตารางสั่งผลิต" },
  { key: "cutting-jobs", label: "ใบงานตัด" },
];

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

function MenuCheckboxes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {MENUS.map((m) => (
        <label key={m.key} className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => onChange(value.includes(m.key) ? value.filter((k) => k !== m.key) : [...value, m.key])}
            className={cn(
              "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer",
              value.includes(m.key) ? "bg-accent border-accent" : "border-border"
            )}
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

function EmployeeForm({
  initial,
  onSave,
  onCancel,
  isEdit,
}: {
  initial: FormState;
  onSave: (f: FormState) => Promise<void>;
  onCancel: () => void;
  isEdit: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!form.name.trim()) { setErr("ใส่ชื่อพนักงาน"); return; }
    if (!isEdit && form.pin.length !== 6) { setErr("PIN ต้องมี 6 หลัก"); return; }
    if (isEdit && form.pin && form.pin.length !== 6) { setErr("PIN ต้องมี 6 หลัก"); return; }
    setSaving(true);
    try { await onSave(form); } catch (e) { setErr(String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-2">ชื่อพนักงาน</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="เช่น น้องบีม"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/");
  }, [user, router]);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/employees")
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form: FormState) => {
    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    setAdding(false);
    load();
  };

  const handleEdit = async (id: string, form: FormState) => {
    const body: Record<string, unknown> = { name: form.name, allowedMenus: form.allowedMenus };
    if (form.pin) body.pin = form.pin;
    const res = await fetch(`/api/admin/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
    setEditId(null);
    load();
  };

  const handleToggle = async (emp: Employee) => {
    await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !emp.isActive }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  };

  if (user?.role !== "admin") return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">จัดการพนักงาน</h1>
          <p className="text-sm text-muted-2">กำหนด PIN และสิทธิ์การใช้งาน</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> เพิ่มพนักงาน
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">เพิ่มพนักงานใหม่</h2>
          <EmployeeForm
            initial={{ name: "", pin: "", allowedMenus: [] }}
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            isEdit={false}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-2">กำลังโหลด...</div>
      ) : employees.length === 0 && !adding ? (
        <div className="py-12 text-center text-sm text-muted-2">ยังไม่มีพนักงาน</div>
      ) : (
        <div className="flex flex-col gap-3">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className={cn(
                "rounded-xl border bg-surface p-4 shadow-sm transition-opacity",
                !emp.isActive && "opacity-50"
              )}
            >
              {editId === emp.id ? (
                <>
                  <h3 className="mb-4 text-sm font-semibold">แก้ไข {emp.name}</h3>
                  <EmployeeForm
                    initial={{ name: emp.name, pin: "", allowedMenus: emp.allowedMenus }}
                    onSave={(f) => handleEdit(emp.id, f)}
                    onCancel={() => setEditId(null)}
                    isEdit
                  />
                </>
              ) : deleteId === emp.id ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm">ลบ <strong>{emp.name}</strong> ออกจากระบบ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                    >
                      ยืนยันลบ
                    </button>
                    <button onClick={() => setDeleteId(null)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-surface-2">
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{emp.name}</span>
                      {!emp.isActive && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted-2">ระงับ</span>
                      )}
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
                    <button
                      onClick={() => handleToggle(emp)}
                      title={emp.isActive ? "ระงับ" : "เปิดใช้"}
                      className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
                    >
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

      {/* Admin card */}
      <AdminPinCard />
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
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin, newPin }),
    });
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
        <button
          onClick={() => { setOpen((o) => !o); setMsg(null); }}
          className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs hover:bg-surface-2"
        >
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
          {msg && (
            <p className={`text-xs ${msg.type === "ok" ? "text-green-500" : "text-red-500"}`}>{msg.text}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button onClick={() => { setOpen(false); setMsg(null); }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2">
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
