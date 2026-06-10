import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

const fabrics = JSON.parse(readFileSync(path.join(root, "src/data/fabrics.json"), "utf-8"));
const shirtStyles = JSON.parse(readFileSync(path.join(root, "src/data/shirt-styles.json"), "utf-8"));
const groups = JSON.parse(readFileSync(path.join(root, "src/data/groups.json"), "utf-8"));
const columns = JSON.parse(readFileSync(path.join(root, "src/data/production-columns.json"), "utf-8"));

// fabrics — single row JSONB
console.log("Importing fabrics...");
const { error: e1 } = await db.from("fabrics").upsert({ id: "singleton", data: fabrics, updated_at: new Date().toISOString() });
if (e1) { console.error("fabrics:", e1.message); } else { console.log("  ✓ fabrics"); }

// production_columns — single row JSONB
console.log("Importing production_columns...");
const { error: e2 } = await db.from("production_columns").upsert({ id: "singleton", data: columns, updated_at: new Date().toISOString() });
if (e2) { console.error("production_columns:", e2.message); } else { console.log("  ✓ production_columns"); }

// shirt_styles — individual rows
console.log("Importing shirt_styles...");
const styleRows = shirtStyles.map(({ id, name, ...rest }) => ({ id, name, data: rest }));
const { error: e3 } = await db.from("shirt_styles").upsert(styleRows);
if (e3) { console.error("shirt_styles:", e3.message); } else { console.log(`  ✓ ${styleRows.length} shirt_styles`); }

// groups — individual rows
console.log("Importing groups...");
const groupRows = groups.map(({ id, name, orderIds, color, createdAt }) => ({
  id,
  name,
  order_ids: orderIds ?? [],
  color: color ?? null,
  created_at: createdAt ?? new Date().toISOString(),
}));
const { error: e4 } = await db.from("groups").upsert(groupRows);
if (e4) { console.error("groups:", e4.message); } else { console.log(`  ✓ ${groupRows.length} groups`); }

console.log("\nDone!");
