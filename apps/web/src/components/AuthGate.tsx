"use client";

import { CheckCircle2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  confirmEmailSignUp,
  configureAwsAuth,
  getAwsAccessToken,
  getCurrentAwsAccount,
  signInWithEmail,
  signOutAws,
  signUpWithEmail,
  type AuthAccount
} from "../lib/awsAuth";
import { CoachWorkspace } from "./CoachWorkspace";

const allowLocalDemoFallback =
  process.env.NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK !== "false");
const demoAccountLabel =
  process.env.NEXT_PUBLIC_ENABLE_SUBMISSION_DEMO === "true" ? "Submission demo" : "Development demo";

type AuthMode = "sign-in" | "sign-up" | "confirm";

export function AuthGate() {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isReady, setIsReady] = useState(() => !configureAwsAuth());
  const authConfigured = configureAwsAuth();

  useEffect(() => {
    if (!authConfigured) {
      return;
    }

    let isMounted = true;

    getCurrentAwsAccount()
      .then((currentAccount) => {
        if (isMounted) {
          setAccount(currentAccount);
          setIsReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authConfigured]);

  const signOut = useCallback(async () => {
    await signOutAws();
    setAccount(null);
  }, []);

  if (!authConfigured) {
    if (allowLocalDemoFallback) {
      return (
        <CoachWorkspace
          accountEmail={demoAccountLabel}
          authMode="demo"
          getAccessToken={getAwsAccessToken}
        />
      );
    }

    return <AuthUnavailable />;
  }

  if (!isReady) {
    return <AuthFrame title="Checking your session" description="SpeakAble is preparing your private workspace." />;
  }

  if (!account) {
    return <AuthForm onSignedIn={setAccount} />;
  }

  return (
    <CoachWorkspace
      accountEmail={account.email ?? "Signed in"}
      authMode="signed-in"
      getAccessToken={getAwsAccessToken}
      onSignOut={signOut}
    />
  );
}

function AuthForm({ onSignedIn }: { onSignedIn: (account: AuthAccount) => void }) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("Use your AWS Cognito account to enter the private coach workspace.");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode !== "confirm" && password.length < 8) {
      setMessage("Use at least 8 characters for the password.");
      return;
    }

    setIsSubmitting(true);
    setMessage(mode === "sign-in" ? "Signing in" : mode === "sign-up" ? "Creating account" : "Confirming account");

    try {
      if (mode === "sign-in") {
        const result = await signInWithEmail(email, password);
        if (result.nextStep.signInStep === "DONE") {
          const account = await getCurrentAwsAccount();
          if (account) {
            onSignedIn(account);
          }
          setMessage("Signed in");
        } else {
          setMessage(`Next step required: ${result.nextStep.signInStep}`);
        }
      } else if (mode === "sign-up") {
        const result = await signUpWithEmail(email, password);
        if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setMode("confirm");
          setMessage("Enter the confirmation code sent by AWS Cognito.");
        } else {
          setMessage("Account created. You can sign in now.");
          setMode("sign-in");
        }
      } else {
        await confirmEmailSignUp(email, confirmationCode);
        setMessage("Account confirmed. Sign in to continue.");
        setMode("sign-in");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title={mode === "sign-in" ? "Welcome back" : mode === "sign-up" ? "Create your account" : "Confirm account"}
      description="SpeakAble uses AWS Cognito for sign-up, sign-in, session refresh, and bearer tokens for the API."
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
          className={mode === "sign-up" || mode === "confirm" ? "selected" : ""}
          onClick={() => setMode("sign-up")}
          role="tab"
          aria-selected={mode === "sign-up" || mode === "confirm"}
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

        {mode !== "confirm" ? (
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
        ) : (
          <label>
            <span className="field-label">Confirmation code</span>
            <input
              type="text"
              inputMode="numeric"
              value={confirmationCode}
              autoComplete="one-time-code"
              onChange={(event) => setConfirmationCode(event.target.value)}
              required
            />
          </label>
        )}

        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {mode === "confirm" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : mode === "sign-in" ? (
            <LogIn size={18} aria-hidden="true" />
          ) : (
            <UserPlus size={18} aria-hidden="true" />
          )}
          {isSubmitting
            ? "Working"
            : mode === "confirm"
              ? "Confirm account"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
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
      title="Authentication needs AWS configuration"
      description="Set NEXT_PUBLIC_AWS_REGION, NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID, and NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID before using production auth."
    >
      <div className="auth-warning">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>Local demo fallback is disabled, so the app is waiting for AWS Cognito credentials.</p>
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
