// ============================================================
// WINX Back Office — Domain Types
// ============================================================

// ลูกค้า 3 กลุ่ม
export type CustomerType =
  | "design" // A: ออกแบบอย่างเดียว
  | "design_produce" // B: ออกแบบ + ผลิต
  | "produce"; // C: มีแบบเอง + ผลิตอย่างเดียว

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  design: "ออกแบบ",
  design_produce: "ออกแบบ + ผลิต",
  produce: "ผลิต",
};

// ต้นทุนผลิต (กลุ่ม B, C)
export interface ProductionCost {
  fabric: number; // ต้นทุนผ้า
  paper: number; // ต้นทุนกระดาษซับ
  ink: number; // ต้นทุนหมึก
  cut: number; // ต้นทุนตัด
  sew: number; // ต้นทุนเย็บ
  other: number; // ต้นทุนอื่นๆ
}

export interface Order {
  id: string; // รหัสเฉพาะ เช่น WNX-2501
  type: CustomerType;
  teamName: string; // ชื่อทีม
  startDate: string; // วันที่เริ่ม (ISO)

  // กลุ่ม A — ออกแบบ
  designPackage?: string; // แพคเกจออกแบบ
  designPackagePrice?: number; // ราคาแพคเกจ

  // กลุ่ม B, C — ผลิต
  shirtType?: string; // ประเภทเสื้อ
  fabricType?: string; // ประเภทเนื้อผ้า
  collarType?: string; // ประเภทคอ
  quantity?: number; // จำนวนตัว
  productionPrice?: number; // ราคาผลิตต่อตัว (ขาย)
  cost?: ProductionCost; // ต้นทุนแยกรายการ
  costOverride?: number; // ต้นทุนผลิตรวมที่พิมพ์เองแทนการรวมอัตโนมัติ
  shipping?: number; // ค่าจัดส่ง
  serviceCharge?: number; // ค่าบริการอื่นๆ
  vat?: boolean; // บวก VAT 7%
  productionStatus?: string; // kanban column id

  // UI
  color?: string;   // hex color สำหรับ left border accent

  // การเงินรวม
  deposit: number; // ยอดมัดจำ
  // ยอดรวม / คงเหลือ คำนวณจาก helper

  hasProductionTable?: boolean; // สร้างตารางสั่งผลิตแล้วหรือยัง
}

// ===== Financial helpers =====
export function costTotal(o: Order): number {
  const qty = o.quantity || 1;
  // ถ้ากรอก costOverride ไว้ใช้ค่านั้น × จำนวนตัว
  if (o.costOverride !== undefined && o.costOverride > 0) return o.costOverride * qty;
  const c = o.cost;
  if (!c) return 0;
  const perUnit = c.fabric + c.paper + c.ink + c.cut + c.sew + c.other;
  return perUnit * qty;
}

// ยอดรวมทั้งหมด (ราคาขาย) = ค่าออกแบบ + (ราคาผลิต/ตัว × จำนวน) + ค่าจัดส่ง + ค่าบริการอื่นๆ [+ VAT 7%]
export function orderSubtotal(o: Order): number {
  if (o.type === "design") return o.designPackagePrice ?? 0;
  const designFee = o.type === "design_produce" ? (o.designPackagePrice ?? 0) : 0;
  const prodTotal = (o.productionPrice ?? 0) * (o.quantity || 1);
  return designFee + prodTotal + (o.shipping ?? 0) + (o.serviceCharge ?? 0);
}

export function orderVat(o: Order): number {
  if (!o.vat) return 0;
  return Math.round(orderSubtotal(o) * 0.07);
}

export function orderTotal(o: Order): number {
  return orderSubtotal(o) + orderVat(o);
}

export function orderBalance(o: Order): number {
  return orderTotal(o) - o.deposit;
}

// กำไร (สำหรับกลุ่มผลิต) — คำนวณจาก subtotal ไม่รวม VAT
export function orderProfit(o: Order): number | null {
  if (o.type === "design") return null;
  return orderSubtotal(o) - costTotal(o);
}

// ===== Order Groups =====
export interface OrderGroup {
  id: string;        // GRP-001
  name: string;      // ชื่อกลุ่ม เช่น "ผาหลวง มิ.ย. 69"
  orderIds: string[]; // รหัสออเดอร์ที่อยู่ในกลุ่ม
  createdAt: string; // ISO
  color?: string;    // hex color สำหรับ left border accent
}

export const GROUP_COLORS = [
  { label: "ไม่มีสี",  value: "" },
  { label: "แดง",     value: "#ef4444" },
  { label: "ส้ม",     value: "#f97316" },
  { label: "เหลือง",  value: "#eab308" },
  { label: "เขียว",   value: "#22c55e" },
  { label: "เขียวน้ำ", value: "#14b8a6" },
  { label: "ฟ้า",     value: "#3b82f6" },
  { label: "ม่วง",    value: "#a855f7" },
  { label: "ชมพู",    value: "#ec4899" },
];

// ===== Kanban =====
export interface QueueCard {
  id: string;
  orderId: string;
  teamName: string;
  shirtType: string;
  dueDate: string; // ISO
  image?: string; // url
  columnId: string;
}

export interface QueueColumn {
  id: string;
  title: string;
  accent: string; // hex/var
}
