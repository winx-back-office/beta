import { PageHeader } from "@/components/ui";
import styles from "@/data/shirt-styles.json";

interface Option {
  name: string;
  price: number;
}

interface PricingTier {
  minQty: number;
  maxQty: number;
  basePrice: number;
}

interface ShirtStyle {
  id: string;
  name: string;
  pricing: PricingTier[];
  collars: Option[];
  fabrics: Option[];
}

function OptionChip({ name, price }: Option) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 py-2.5">
      <span className="text-sm font-medium">{name}</span>
      {price > 0 ? (
        <span className="rounded-full bg-warn/10 border border-warn/30 px-2.5 py-0.5 text-xs font-semibold text-warn">
          +{price} บาท
        </span>
      ) : (
        <span className="rounded-full bg-surface-3 border border-border px-2.5 py-0.5 text-xs text-muted">
          มาตรฐาน
        </span>
      )}
    </div>
  );
}

function Section({ title, options }: { title: string; options: Option[] }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-2">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <OptionChip key={o.name} {...o} />
        ))}
      </div>
    </div>
  );
}

function PricingTable({ tiers, fabrics }: { tiers: PricingTier[]; fabrics: Option[] }) {
  const extraFabrics = fabrics.filter((f) => f.price > 0);

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-2">
        ราคา/ตัว
      </h3>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">จำนวนตัว</th>
              {fabrics.map((f) => (
                <th key={f.name} className="px-4 py-2.5 font-medium text-right">
                  {f.name}
                  {f.price > 0 && (
                    <span className="ml-1.5 text-warn">(+{f.price})</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tiers.map((tier) => (
              <tr key={tier.minQty} className="hover:bg-surface-2">
                <td className="px-4 py-3 font-semibold">
                  {tier.minQty}–{tier.maxQty} ตัว
                </td>
                {fabrics.map((f) => (
                  <td key={f.name} className="px-4 py-3 text-right">
                    <span className={f.price > 0 ? "text-muted" : "font-semibold text-foreground"}>
                      {(tier.basePrice + f.price).toLocaleString()}
                    </span>
                    {f.price === 0 && <span className="ml-1 text-muted text-xs">บาท</span>}
                    {f.price > 0 && <span className="ml-1 text-muted text-xs">บาท</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StyleCard({ style }: { style: ShirtStyle }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border bg-surface-2 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent text-lg font-black">
          {style.name[0]}
        </div>
        <div>
          <h2 className="text-lg font-bold">{style.name}</h2>
          <p className="text-xs text-muted mt-0.5">
            {style.collars.length} แบบคอ · {style.fabrics.length} แบบผ้า · {style.pricing.length} ช่วงราคา
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 p-6">
        <PricingTable tiers={style.pricing} fabrics={style.fabrics} />
        <Section title="คอเสื้อ" options={style.collars} />
        <Section title="เนื้อผ้า" options={style.fabrics} />
      </div>
    </div>
  );
}

export default function ShirtStylesPage() {
  return (
    <div>
      <PageHeader
        title="ข้อมูลทรงเสื้อ"
        subtitle="รวมตัวเลือกคอเสื้อ เนื้อผ้า และราคาแต่ละทรง"
      />
      <div className="p-8 space-y-6 max-w-3xl">
        {(styles as ShirtStyle[]).map((s) => (
          <StyleCard key={s.id} style={s} />
        ))}
      </div>
    </div>
  );
}
