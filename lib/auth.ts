import { env } from "cloudflare:workers";

export const DEFAULT_AUTH_EMAIL = "demo@ledgerly.app";
export const DEFAULT_AUTH_PASSWORD = "ledgerly2026";
export const SESSION_COOKIE = "ledgerly_session";

const authConfig = () => ({
  email: env.AUTH_EMAIL || DEFAULT_AUTH_EMAIL,
  password: env.AUTH_PASSWORD || DEFAULT_AUTH_PASSWORD,
  secret: env.AUTH_SECRET || "ledgerly-demo-session-secret-change-in-production",
});

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyCredentials(email: string, password: string) {
  const config = authConfig();
  return email.trim().toLowerCase() === config.email.toLowerCase() && password === config.password;
}

export async function expectedSessionToken() {
  const config = authConfig();
  return digest(`${config.email}:${config.password}:${config.secret}`);
}

export async function isAuthenticated(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return false;
  return token === (await expectedSessionToken());
}

export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}
