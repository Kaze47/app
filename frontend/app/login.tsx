import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ImageBackground,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useRouter, Link } from "expo-router";
import { Mail, Lock, ArrowRight, Trophy } from "lucide-react-native";

import { colors, radii, space } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

const BG_IMG = "https://static.prod-images.emergentagent.com/jobs/73b0f301-e64a-46a8-b6f6-f6425216c904/images/3d88855ebf1e13e4e577392465832a376a7b36b691087852088c92c791cb0fdb.png";

export default function Login() {
  const router = useRouter();
  const { signInEmail, signInWithSessionToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doLogin = useCallback(async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Enter email & password");
      return;
    }
    setBusy(true);
    try {
      await signInEmail(email.trim().toLowerCase(), password);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Login failed", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  }, [email, password, signInEmail, router]);

  const doGoogle = useCallback(async () => {
    setBusy(true);
    try {
      const redirectUrl =
        Platform.OS === "web"
          ? `${window.location.origin}/`
          : Linking.createURL("auth");
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === "web") {
        window.location.href = authUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type !== "success" || !result.url) {
        setBusy(false);
        return;
      }
      // extract session_id from hash or query
      const url = result.url;
      const cleaned = url.replace("#", "?");
      const u = new URL(cleaned);
      const sid = u.searchParams.get("session_id");
      if (!sid) {
        Alert.alert("Login failed", "No session id returned");
        setBusy(false);
        return;
      }
      const r = await fetch("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", {
        headers: { "X-Session-ID": sid },
      });
      if (!r.ok) throw new Error("Failed to verify session");
      const data = await r.json();
      if (!data.session_token) throw new Error("No session token");
      await signInWithSessionToken(data.session_token);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Google sign-in failed", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  }, [signInWithSessionToken, router]);

  return (
    <ImageBackground source={{ uri: BG_IMG }} style={styles.bg} testID="login-screen">
      <LinearGradient
        colors={["rgba(10,10,10,0.6)", "rgba(10,10,10,0.95)"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Trophy color={colors.voltBlue} size={28} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>HUDDLE</Text>
            <Text style={styles.subtitle}>FIND YOUR GAME · BUILD YOUR SQUAD</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>SIGN IN</Text>

            <View style={styles.inputWrap}>
              <Mail color={colors.textSecondary} size={18} />
              <TextInput
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                testID="login-email-input"
              />
            </View>
            <View style={styles.inputWrap}>
              <Lock color={colors.textSecondary} size={18} />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                testID="login-password-input"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
              onPress={doLogin}
              disabled={busy}
              testID="login-submit-button"
            >
              {busy ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.primaryBtnText}>SIGN IN</Text>
                  <ArrowRight color="#fff" size={18} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={doGoogle}
              disabled={busy}
              testID="login-google-button"
            >
              <Text style={styles.googleBtnText}>CONTINUE WITH GOOGLE</Text>
            </TouchableOpacity>

            <Link href="/register" asChild>
              <TouchableOpacity style={styles.linkRow} testID="login-go-register">
                <Text style={styles.linkText}>
                  No account?{" "}
                  <Text style={{ color: colors.voltBlue, fontWeight: "700" }}>Create one</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: space.md, justifyContent: "center" },
  brand: { alignItems: "center", marginBottom: space.xl },
  logoBadge: {
    width: 64, height: 64, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center", marginBottom: space.md,
  },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 56, color: colors.text, letterSpacing: 2 },
  subtitle: {
    fontFamily: "DMSans_500Medium", fontSize: 12, color: colors.textSecondary,
    letterSpacing: 2, marginTop: space.xs,
  },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.lg, padding: space.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: {
    fontFamily: "BebasNeue_400Regular", fontSize: 28, color: colors.text,
    letterSpacing: 2, marginBottom: space.lg,
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.bg, borderRadius: radii.md, paddingHorizontal: space.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: space.md, height: 52,
  },
  input: {
    flex: 1, color: colors.text, fontSize: 16, fontFamily: "DMSans_400Regular",
    height: 52,
  },
  primaryBtn: {
    backgroundColor: colors.voltBlue, borderRadius: radii.md, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: space.sm,
  },
  primaryBtnText: {
    color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 16, letterSpacing: 1.5,
  },
  divider: {
    flexDirection: "row", alignItems: "center", marginVertical: space.lg, gap: space.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12, letterSpacing: 1 },
  googleBtn: {
    height: 52, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.bg,
  },
  googleBtnText: {
    color: colors.text, fontFamily: "DMSans_700Bold", letterSpacing: 1.2, fontSize: 14,
  },
  linkRow: { alignItems: "center", marginTop: space.lg },
  linkText: { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
});
