"use client";

import { LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { CoachWorkspace } from "./CoachWorkspace";

const allowLocalDemoFallback =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK !== "false";

type AuthMode = "sign-in" | "sign-up";

export function AuthGate() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(() => !supabase);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session);
          setIsReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const getAccessToken = useCallback(async () => {
    if (!supabase) {
      return undefined;
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
  }, [supabase]);

  if (!supabase) {
    if (allowLocalDemoFallback) {
      return (
        <CoachWorkspace
          accountEmail="Development demo"
          authMode="demo"
          getAccessToken={getAccessToken}
        />
      );
    }

    return <AuthUnavailable />;
  }

  if (!isReady) {
    return <AuthFrame title="Checking your session" description="SpeakAble is preparing your private workspace." />;
  }

  if (!session) {
    return <AuthForm supabase={supabase} />;
  }

  return (
    <CoachWorkspace
      accountEmail={session.user.email ?? "Signed in"}
      authMode="signed-in"
      getAccessToken={getAccessToken}
      onSignOut={signOut}
    />
  );
}

function AuthForm({ supabase }: { supabase: SupabaseClient }) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("Use your Supabase account to enter the private coach workspace.");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setMessage("Use at least 8 characters for the password.");
      return;
    }

    setIsSubmitting(true);
    setMessage(mode === "sign-in" ? "Signing in" : "Creating account");

    const response =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { product: "SpeakAble" } }
          });

    if (response.error) {
      setMessage(response.error.message);
      setIsSubmitting(false);
      return;
    }

    setMessage(
      mode === "sign-up" && !response.data.session
        ? "Check your email to confirm the account, then sign in."
        : "Signed in"
    );
    setIsSubmitting(false);
  }

  return (
    <AuthFrame
      title={mode === "sign-in" ? "Welcome back" : "Create your account"}
      description="SpeakAble stores practice history behind Supabase Auth and row-level security."
    >
      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={mode === "sign-in" ? "selected" : ""}
          onClick={() => setMode("sign-in")}
          role="tab"
          aria-selected={mode === "sign-in"}
        >
          <LogIn size={16} aria-hidden="true" />
          Sign in
        </button>
        <button
          type="button"
          className={mode === "sign-up" ? "selected" : ""}
          onClick={() => setMode("sign-up")}
          role="tab"
          aria-selected={mode === "sign-up"}
        >
          <UserPlus size={16} aria-hidden="true" />
          Sign up
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span className="field-label">Email</span>
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          <span className="field-label">Password</span>
          <input
            type="password"
            value={password}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {mode === "sign-in" ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
          {isSubmitting ? "Working" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="auth-status" aria-live="polite">
        {message}
      </p>
    </AuthFrame>
  );
}

function AuthUnavailable() {
  return (
    <AuthFrame
      title="Authentication needs configuration"
      description="Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before using production auth."
    >
      <div className="auth-warning">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>Local demo fallback is disabled, so the app is waiting for Supabase credentials.</p>
      </div>
    </AuthFrame>
  );
}

function AuthFrame({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">
            SA
          </div>
          <div>
            <p className="brand-name">SpeakAble</p>
            <p className="brand-caption">Clear, kind, firm</p>
          </div>
        </div>
        <div className="auth-card">
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
