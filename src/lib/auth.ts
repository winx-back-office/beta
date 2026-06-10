export interface AuthUser {
  id: string;
  name: string;
  role: "admin" | "employee";
  allowedMenus: string[]; // 'orders' | 'queue' | 'production-tables' | 'cutting-jobs'
}

const KEY = "winx:session";

export function getSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setSession(user: AuthUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function canAccess(user: AuthUser | null, menuKey: string | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (menuKey === null) return false;
  return user.allowedMenus.includes(menuKey);
}

export const PUBLIC_PATHS = ["/login", "/pay", "/cut", "/track"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
