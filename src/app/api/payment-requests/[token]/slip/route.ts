import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PaymentRequest } from "@/lib/payment-config";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function toPaymentRequest(row: Record<string, unknown>): PaymentRequest {
  return {
    token: row.token as string,
    orderId: row.order_id as string,
    teamName: row.team_name as string,
    amount: Number(row.amount ?? 0),
    accountIndex: Number(row.account_index ?? 0),
    note: (row.note as string) ?? "",
    status: row.status as PaymentRequest["status"],
    createdAt: row.created_at as string,
    slipUrl: (row.slip_url as string) ?? null,
    slipUploadedAt: (row.slip_uploaded_at as string) ?? null,
    approvedAt: (row.approved_at as string) ?? null,
    approvedAmount: row.approved_amount != null ? Number(row.approved_amount) : null,
  };
}

// POST /api/payment-requests/[token]/slip
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const formData = await req.formData();
  const file = formData.get("slip") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${token}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // อัพโหลดไป Supabase Storage bucket "slips"
  const { error: uploadError } = await db()
    .storage
    .from("Slip")
    .upload(fileName, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = db().storage.from("Slip").getPublicUrl(fileName);
  const slipUrl = urlData.publicUrl;

  const { data, error } = await db()
    .from("payment_requests")
    .update({
      slip_url: slipUrl,
      slip_uploaded_at: new Date().toISOString(),
      status: "slip_uploaded",
    })
    .eq("token", token)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, paymentRequest: toPaymentRequest(data) });
}
