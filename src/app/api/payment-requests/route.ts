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

// GET /api/payment-requests
export async function GET() {
  const { data, error } = await db()
    .from("payment_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toPaymentRequest));
}

// POST /api/payment-requests
export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = crypto.randomUUID();

  const row = {
    token,
    order_id: body.orderId,
    team_name: body.teamName,
    amount: Number(body.amount),
    account_index: Number(body.accountIndex ?? 0),
    note: body.note ?? "",
    status: "pending",
    created_at: new Date().toISOString(),
    slip_url: null,
    slip_uploaded_at: null,
    approved_at: null,
    approved_amount: null,
  };

  const { data, error } = await db()
    .from("payment_requests")
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, paymentRequest: toPaymentRequest(data) });
}
