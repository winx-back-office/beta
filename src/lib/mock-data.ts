import type { Order, QueueCard, QueueColumn } from "./types";

export const orders: Order[] = [
  {
    id: "WNX-2501",
    type: "design_produce",
    teamName: "TOMKHOM FC",
    startDate: "2026-01-08",
    shirtType: "เสื้อแขนสั้น",
    fabricType: "ผ้าเรียบ 140 แกรม",
    productionPrice: 12000,
    cost: { fabric: 3200, paper: 600, ink: 800, cut: 700, sew: 1500, other: 400 },
    shipping: 150,
    deposit: 6000,
    hasProductionTable: true,
  },
  {
    id: "WNX-2502",
    type: "design",
    teamName: "VYCE Jersey",
    startDate: "2026-01-12",
    designPackage: "แพคเกจ Premium (เสื้อ + กางเกง)",
    designPackagePrice: 3500,
    deposit: 1500,
  },
  {
    id: "WNX-2503",
    type: "produce",
    teamName: "EGAT JACKET",
    startDate: "2026-01-15",
    shirtType: "แจ็คเก็ต",
    fabricType: "ผ้าไมโครพีช",
    productionPrice: 18500,
    cost: { fabric: 5400, paper: 900, ink: 1100, cut: 1200, sew: 2800, other: 600 },
    shipping: 250,
    deposit: 9000,
    hasProductionTable: true,
  },
  {
    id: "WNX-2504",
    type: "design_produce",
    teamName: "JONES500",
    startDate: "2026-01-20",
    shirtType: "เสื้อแขนสั้น",
    fabricType: "ผ้าจูติ",
    productionPrice: 9800,
    cost: { fabric: 2600, paper: 500, ink: 650, cut: 600, sew: 1300, other: 300 },
    shipping: 150,
    deposit: 0,
    hasProductionTable: false,
  },
  {
    id: "WNX-2505",
    type: "design",
    teamName: "XBIO Esports",
    startDate: "2026-01-22",
    designPackage: "แพคเกจ Standard (เสื้ออย่างเดียว)",
    designPackagePrice: 2000,
    deposit: 2000,
  },
  {
    id: "WNX-2506",
    type: "produce",
    teamName: "YVES Running",
    startDate: "2026-01-25",
    shirtType: "เสื้อกล้าม",
    fabricType: "ผ้าเรียบ 140 แกรม",
    productionPrice: 7200,
    cost: { fabric: 1900, paper: 400, ink: 500, cut: 450, sew: 950, other: 200 },
    shipping: 100,
    deposit: 3600,
    hasProductionTable: false,
  },
];

// ===== คิวออกแบบ =====
export const designColumns: QueueColumn[] = [
  { id: "wait_design", title: "รอออกแบบ", accent: "var(--info)" },
  { id: "designing", title: "กำลังออกแบบ", accent: "var(--accent)" },
  { id: "revise", title: "รอแก้ไข", accent: "var(--warn)" },
  { id: "approve", title: "รออนุมัติ", accent: "#a855f7" },
  { id: "done", title: "เสร็จสิ้น", accent: "var(--success)" },
];

export const designCards: QueueCard[] = [
  { id: "d1", orderId: "WNX-2502", teamName: "VYCE Jersey", shirtType: "เสื้อ + กางเกง", dueDate: "2026-01-28", columnId: "revise" },
  { id: "d2", orderId: "WNX-2505", teamName: "XBIO Esports", shirtType: "เสื้อแขนสั้น", dueDate: "2026-02-01", columnId: "wait_design" },
  { id: "d3", orderId: "WNX-2501", teamName: "TOMKHOM FC", shirtType: "เสื้อแขนสั้น", dueDate: "2026-01-26", columnId: "approve" },
  { id: "d4", orderId: "WNX-2504", teamName: "JONES500", shirtType: "เสื้อแขนสั้น", dueDate: "2026-02-05", columnId: "designing" },
];

// ===== คิวผลิต =====
export const productionColumns: QueueColumn[] = [
  { id: "summary", title: "รอสรุปงานออกแบบ", accent: "var(--info)" },
  { id: "pattern_in", title: "เข้าแพทเทิร์น", accent: "var(--success)" },
  { id: "size", title: "วางไซส์", accent: "var(--info)" },
  { id: "print", title: "พิมพ์", accent: "var(--warn)" },
  { id: "pattern_cut", title: "ตัดแพทเทิร์น", accent: "var(--accent)" },
  { id: "sew", title: "รอส่ง-เย็บ", accent: "#a855f7" },
  { id: "done", title: "ผลิตเสร็จแล้ว", accent: "var(--success)" },
];

export const productionCards: QueueCard[] = [
  { id: "p1", orderId: "WNX-2501", teamName: "TOMKHOM FC", shirtType: "เสื้อแขนสั้น", dueDate: "2026-01-26", columnId: "summary" },
  { id: "p2", orderId: "WNX-2503", teamName: "EGAT JACKET", shirtType: "แจ็คเก็ต", dueDate: "2026-01-30", columnId: "pattern_in" },
  { id: "p3", orderId: "WNX-2506", teamName: "YVES Running", shirtType: "เสื้อกล้าม", dueDate: "2026-02-03", columnId: "size" },
  { id: "p4", orderId: "WNX-2504", teamName: "JONES500", shirtType: "เสื้อแขนสั้น", dueDate: "2026-01-29", columnId: "print" },
];

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}
