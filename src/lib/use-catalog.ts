"use client";

import { useEffect, useState } from "react";

interface FabricVariant { name: string }
interface Fabric { id: string; name: string; variants: FabricVariant[] }

export interface CollarOption { name: string; price: number }
export interface FabricOption { name: string; price: number }
export interface PricingTier { minQty: number; maxQty: number; basePrice: number }
export interface ShirtStyle {
  id: string;
  name: string;
  pricing: PricingTier[];
  collars: CollarOption[];
  fabrics: FabricOption[];
}

// ─── raw data hooks ───────────────────────────────────────────

export function useShirtStyles(): ShirtStyle[] {
  const [data, setData] = useState<ShirtStyle[]>([]);
  useEffect(() => {
    fetch("/api/shirt-styles").then(r => r.json()).then(setData);
  }, []);
  return data;
}

export function useFabricsData(): Fabric[] {
  const [data, setData] = useState<Fabric[]>([]);
  useEffect(() => {
    fetch("/api/fabrics").then(r => r.json()).then(setData);
  }, []);
  return data;
}

// ─── convenience lists ────────────────────────────────────────

export function useFabricOptions(): string[] {
  const data = useFabricsData();
  return data.flatMap(f => f.variants.length > 0 ? f.variants.map(v => v.name) : [f.name]);
}

export function useShirtStyleOptions(): string[] {
  return useShirtStyles().map(s => s.name);
}

export function useCollarOptions(): string[] {
  const styles = useShirtStyles();
  const seen = new Set<string>();
  const all: string[] = [];
  styles.forEach(s => s.collars.forEach(c => {
    if (!seen.has(c.name)) { seen.add(c.name); all.push(c.name); }
  }));
  return all;
}

// ─── price calculator ─────────────────────────────────────────

/**
 * คำนวณราคาผลิต/ตัว จากทรงเสื้อ + ผ้า + คอ + จำนวน
 * return null ถ้ายังไม่ครบข้อมูลหรือจำนวนไม่อยู่ใน tier ไหน
 */
export function calcProductionPrice(
  styles: ShirtStyle[],
  fabricsData: Fabric[],
  shirtStyleName: string,
  fabricVariantName: string,
  collarName: string,
  qty: number
): { price: number; inRange: boolean } | null {
  const style = styles.find(s => s.name === shirtStyleName);
  if (!style || !style.pricing.length) return null;

  // หา tier ที่ตรง หรือ tier ใกล้ที่สุด
  const exactTier = style.pricing.find(t => qty >= t.minQty && qty <= t.maxQty);
  const sortedTiers = [...style.pricing].sort((a, b) => a.minQty - b.minQty);
  const fallbackTier = qty < sortedTiers[0].minQty
    ? sortedTiers[0]
    : sortedTiers[sortedTiers.length - 1];
  const tier = exactTier ?? fallbackTier;
  const inRange = !!exactTier;

  // หา extra ผ้า — map variant → ชื่อ parent → หา price ใน style.fabrics
  let fabricExtra = 0;
  for (const fabric of fabricsData) {
    const isMatch =
      fabric.name === fabricVariantName ||
      fabric.variants.some(v => v.name === fabricVariantName);
    if (isMatch) {
      const found = style.fabrics.find(f => f.name === fabric.name);
      fabricExtra = found?.price ?? 0;
      break;
    }
  }

  // หา extra คอ
  const collarExtra = style.collars.find(c => c.name === collarName)?.price ?? 0;

  return { price: tier.basePrice + fabricExtra + collarExtra, inRange };
}
