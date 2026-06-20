import { NextResponse } from "next/server";
import { currentWindow, generateToken, windowSecondsRemaining } from "@/lib/timeclock";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const window = currentWindow();
  const token = generateToken(window);
  const remaining = windowSecondsRemaining();
  return NextResponse.json({ token, remaining, window: window.toString() });
}
