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

const authCopy: Record<AuthMode, { description: string; status: string }> = {
  "sign-in": {
    description: "Sign in to continue your private practice.",
    status: "Enter your email and password to continue."
  },
  "sign-up": {
    description: "Create a private account to save your progress.",
    status: "Use an email you can access for account confirmation."
  },
  confirm: {
    description: "Enter the confirmation code sent to your email.",
    status: "Check your email for the confirmation code."
  }
};

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
  const [message, setMessage] = useState(authCopy["sign-in"].status);

  function chooseMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(authCopy[nextMode].status);
  }

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
          setMessage("One more sign-in step is needed. Check your email and try again.");
        }
      } else if (mode === "sign-up") {
        const result = await signUpWithEmail(email, password);
        if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          chooseMode("confirm");
        } else {
          chooseMode("sign-in");
          setMessage("Account created. Sign in to continue.");
        }
      } else {
        await confirmEmailSignUp(email, confirmationCode);
        setMessage("Account confirmed. Sign in to continue.");
        setMode("sign-in");
      }
    } catch (error) {
      setMessage(authErrorMessage(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title={mode === "sign-in" ? "Welcome back" : mode === "sign-up" ? "Create your account" : "Confirm account"}
      description={authCopy[mode].description}
    >
      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={mode === "sign-in" ? "selected" : ""}
          onClick={() => chooseMode("sign-in")}
          role="tab"
          aria-selected={mode === "sign-in"}
        >
          <LogIn size={16} aria-hidden="true" />
          Sign in
        </button>
        <button
          type="button"
          className={mode === "sign-up" || mode === "confirm" ? "selected" : ""}
          onClick={() => chooseMode("sign-up")}
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
      title="Sign-in is temporarily unavailable"
      description="SpeakAble could not prepare secure sign-in. Please try again shortly."
    >
      <div className="auth-warning">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>Your account data has not been loaded on this device.</p>
      </div>
    </AuthFrame>
  );
}

function authErrorMessage(error: unknown, mode: AuthMode) {
  if (!(error instanceof Error)) {
    return "We could not complete that request. Please try again.";
  }

  const detail = `${error.name} ${error.message}`.toLowerCase();
  if (detail.includes("notauthorized") || detail.includes("incorrect")) {
    return "We could not sign you in. Check your email and password.";
  }
  if (detail.includes("usernotconfirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (detail.includes("usernameexists")) {
    return "An account already exists for that email. Try signing in.";
  }
  if (detail.includes("codemismatch")) {
    return "That confirmation code did not match. Check the code and try again.";
  }
  if (detail.includes("expiredcode")) {
    return "That confirmation code expired. Request a new code and try again.";
  }
  if (detail.includes("network") || detail.includes("failed to fetch")) {
    return "Network connection interrupted. Please try again.";
  }

  return mode === "sign-in"
    ? "We could not sign you in. Please try again."
    : "We could not complete account setup. Please try again.";
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
