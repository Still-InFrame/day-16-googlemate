"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Logo } from "@/components/brand";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/search";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isSignup = mode === "signup";

  async function signInWithGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // On success the browser redirects to Google, so no further work here.
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is required, no session is returned.
        if (!data.session) {
          setEmailSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Check your inbox</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account, then sign in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-ink"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo className="mb-5" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          {isSignup
            ? "Start finding businesses worth pitching."
            : "Sign in to your googlemate workspace."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" hint={isSignup ? "At least 6 characters." : undefined}>
          <Input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? "Redirecting…" : "Continue with Google"}
      </button>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {isSignup ? "Already have an account? " : "New to googlemate? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-brand hover:text-brand-ink"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
