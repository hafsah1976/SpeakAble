import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typeScale } from "@speakable/ui";
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
import { CoachScreen } from "./CoachScreen";

const allowLocalDemoFallback = process.env.EXPO_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK === "true";

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
      return <CoachScreen accountEmail="Development demo" authMode="demo" getAccessToken={getAwsAccessToken} />;
    }

    return (
      <AuthFrame title="Authentication needs AWS configuration">
        <Text style={styles.description}>
          Set EXPO_PUBLIC_AWS_REGION, EXPO_PUBLIC_AWS_COGNITO_USER_POOL_ID, and
          EXPO_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID before using production auth.
        </Text>
      </AuthFrame>
    );
  }

  if (!isReady) {
    return (
      <AuthFrame title="Checking your session">
        <Text style={styles.description}>SpeakAble is preparing your private workspace.</Text>
      </AuthFrame>
    );
  }

  if (!account) {
    return <AuthForm onSignedIn={setAccount} />;
  }

  return (
    <CoachScreen
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

  async function submit() {
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
    <AuthFrame title={mode === "sign-in" ? "Welcome back" : mode === "sign-up" ? "Create your account" : "Confirm account"}>
      <Text style={styles.description}>
        SpeakAble uses AWS Cognito for sign-up, sign-in, session refresh, and API bearer tokens.
      </Text>
      <View style={styles.tabRow} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "sign-in" }}
          style={[styles.tabButton, mode === "sign-in" && styles.tabSelected]}
          onPress={() => setMode("sign-in")}
        >
          <Text style={[styles.tabText, mode === "sign-in" && styles.tabTextSelected]}>Sign in</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "sign-up" || mode === "confirm" }}
          style={[styles.tabButton, (mode === "sign-up" || mode === "confirm") && styles.tabSelected]}
          onPress={() => setMode("sign-up")}
        >
          <Text style={[styles.tabText, (mode === "sign-up" || mode === "confirm") && styles.tabTextSelected]}>
            Sign up
          </Text>
        </Pressable>
      </View>
      <Text style={styles.label}>Email</Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      {mode !== "confirm" ? (
        <>
          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Confirmation code</Text>
          <TextInput
            accessibilityLabel="Confirmation code"
            autoCapitalize="none"
            autoComplete="one-time-code"
            keyboardType="number-pad"
            value={confirmationCode}
            onChangeText={setConfirmationCode}
            style={styles.input}
          />
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        disabled={isSubmitting}
        style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
        onPress={submit}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting
            ? "Working"
            : mode === "confirm"
              ? "Confirm account"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
        </Text>
      </Pressable>
      <Text style={styles.statusText} accessibilityLiveRegion="polite">
        {message}
      </Text>
    </AuthFrame>
  );
}

function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>SA</Text>
          </View>
          <View>
            <Text style={styles.brandName}>SpeakAble</Text>
            <Text style={styles.brandCaption}>Clear, kind, firm</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1
  },
  container: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
    padding: spacing.lg
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  brandMarkText: {
    color: colors.accentDark,
    fontWeight: "800"
  },
  brandName: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: "800"
  },
  brandCaption: {
    color: colors.mutedText,
    fontSize: typeScale.small,
    marginTop: 2
  },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 36
  },
  description: {
    color: colors.mutedText,
    fontSize: typeScale.body,
    lineHeight: 23
  },
  tabRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  tabButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: "center"
  },
  tabSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  tabText: {
    color: colors.mutedText,
    fontSize: typeScale.small,
    fontWeight: "800"
  },
  tabTextSelected: {
    color: colors.accentDark
  },
  label: {
    color: colors.mutedText,
    fontSize: typeScale.label,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  input: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typeScale.body,
    minHeight: 48,
    padding: spacing.md
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 50
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typeScale.body,
    fontWeight: "800"
  },
  disabledButton: {
    opacity: 0.72
  },
  statusText: {
    backgroundColor: colors.blueSoft,
    borderLeftColor: colors.blue,
    borderLeftWidth: 3,
    color: colors.blue,
    fontSize: typeScale.small,
    fontWeight: "700",
    lineHeight: 20,
    padding: spacing.md
  }
});
