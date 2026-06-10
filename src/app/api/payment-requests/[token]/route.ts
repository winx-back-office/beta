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

// GET /api/payment-requests/[token]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { data, error } = await db().from("payment_requests").select("*").eq("token", token).single();
  if (error) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(toPaymentRequest(data));
}

// DELETE /api/payment-requests/[token]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { data: existing } = await db().from("payment_requests").select("status").eq("token", token).single();
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.status !== "pending") return NextResponse.json({ error: "ยกเลิกได้เฉพาะรายการที่ยังรอชำระ" }, { status: 400 });

  const { error } = await db().from("payment_requests").delete().eq("token", token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PUT /api/payment-requests/[token]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();

  const row: Record<string, unknown> = {};
  if (body.status !== undefined) row.status = body.status;
  if (body.approvedAt !== undefined) row.approved_at = body.approvedAt;
  if (body.approvedAmount !== undefined) row.approved_amount = body.approvedAmount;
  if (body.slipUrl !== undefined) row.slip_url = body.slipUrl;
  if (body.slipUploadedAt !== undefined) row.slip_uploaded_at = body.slipUploadedAt;
  if (body.note !== undefined) row.note = body.note;
  if (body.amount !== undefined) row.amount = body.amount;
  if (body.accountIndex !== undefined) row.account_index = body.accountIndex;

  const { data, error } = await db()
    .from("payment_requests")
    .update(row)
    .eq("token", token)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, paymentRequest: toPaymentRequest(data) });
}
