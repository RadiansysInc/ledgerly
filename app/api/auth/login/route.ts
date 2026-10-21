import { expectedSessionToken, sessionCookie, verifyCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const valid = await verifyCredentials(body.email || "", body.password || "");
    if (!valid) {
      return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const secure = new URL(request.url).protocol === "https:";
    return Response.json(
      { authenticated: true },
      { headers: { "Set-Cookie": sessionCookie(await expectedSessionToken(), secure) } },
    );
  } catch {
    return Response.json({ error: "Unable to sign in." }, { status: 400 });
  }
}
