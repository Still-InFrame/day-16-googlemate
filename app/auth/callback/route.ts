import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth (Google) callback: exchange the auth code for a session, then redirect
 * into the app. The provider redirects here after sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/search";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Behind Vercel, prefer the forwarded host so we land on the real domain.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = isLocal
        ? origin
        : forwardedHost
          ? `https://${forwardedHost}`
          : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
