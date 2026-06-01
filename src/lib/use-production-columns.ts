"use client";

import { useEffect, useState } from "react";
import type { QueueColumn } from "./types";
import { productionColumns as fallback } from "./mock-data";

export function useProductionColumns() {
  const [cols, setCols] = useState<QueueColumn[]>(fallback);

  useEffect(() => {
    fetch("/api/production-columns", { cache: "no-store" })
      .then(r => r.json())
      .then(setCols)
      .catch(() => {});
  }, []);

  return cols;
}
