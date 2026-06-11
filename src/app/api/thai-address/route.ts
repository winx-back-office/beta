import { NextResponse, type NextRequest } from "next/server";
import { searchAddressByDistrict, searchAddressByAmphoe } from "thai-address-database";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const byDistrict = searchAddressByDistrict(q);
  const byAmphoe = searchAddressByAmphoe(q);

  // merge + deduplicate
  const seen = new Set<string>();
  const results: { district: string; amphoe: string; province: string; zipcode: string }[] = [];
  for (const r of [...byDistrict, ...byAmphoe]) {
    const key = `${r.district}|${r.amphoe}|${r.province}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ district: r.district, amphoe: r.amphoe, province: r.province, zipcode: r.zipcode });
    }
    if (results.length >= 20) break;
  }

  return NextResponse.json(results);
}
