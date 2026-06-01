import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatBaht(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
