import crypto from "crypto";

const WINDOW_SECONDS = 30;
const SECRET = process.env.TIMECLOCK_SECRET ?? "winx-timeclock-secret-change-me";

export function currentWindow(): number {
  return Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
}

export function windowSecondsRemaining(): number {
  const elapsed = Math.floor(Date.now() / 1000) % WINDOW_SECONDS;
  return WINDOW_SECONDS - elapsed;
}

export function generateToken(window: number): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(String(window))
    .digest("hex")
    .slice(0, 24);
}

export function verifyToken(token: string): number | null {
  const now = currentWindow();
  const padded = token.padEnd(24, "0").slice(0, 24);
  for (const w of [now, now - 1]) {
    const expected = generateToken(w);
    if (
      padded.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(padded))
    ) {
      return w;
    }
  }
  return null;
}

export function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
