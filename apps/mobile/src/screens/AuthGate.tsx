import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { colors, radii, spacing, typeScale } from "@speakable/ui";
import { getSupabaseMobileClient } from "../lib/supabase";
import { CoachScreen } from "./CoachScreen";

const allowLocalDemoFallback = process.env.EXPO_PUBLIC_ALLOW_LOCAL_DEMO_FALLBACK === "true";

type AuthMode = "sign-in" | "sign-up";

export function AuthGate() {
  const supabase = useMemo(() => getSupabaseMobileClient(), []);
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
      return <CoachScreen accountEmail="Development demo" authMode="demo" getAccessToken={getAccessToken} />;
    }

    return (
      <AuthFrame title="Authentication needs configuration">
        <Text style={styles.description}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before using production auth.
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

  if (!session) {
    return <AuthForm supabase={supabase} />;
  }

  return (
    <CoachScreen
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

  async function submit() {
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
    <AuthFrame title={mode === "sign-in" ? "Welcome back" : "Create your account"}>
      <Text style={styles.description}>
        SpeakAble stores practice history behind Supabase Auth and row-level security.
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
          accessibilityState={{ selected: mode === "sign-up" }}
          style={[styles.tabButton, mode === "sign-up" && styles.tabSelected]}
          onPress={() => setMode("sign-up")}
        >
          <Text style={[styles.tabText, mode === "sign-up" && styles.tabTextSelected]}>Sign up</Text>
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
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        disabled={isSubmitting}
        style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
        onPress={submit}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? "Working" : mode === "sign-in" ? "Sign in" : "Create account"}
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
