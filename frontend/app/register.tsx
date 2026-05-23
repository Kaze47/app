import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { Mail, Lock, User, ArrowLeft } from "lucide-react-native";

import { colors, radii, space } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function Register() {
  const router = useRouter();
  const { signUpEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (!email || !password || !name) {
      Alert.alert("Missing fields", "All fields are required");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password too short", "Min 6 characters");
      return;
    }
    setBusy(true);
    try {
      await signUpEmail(email.trim().toLowerCase(), password, name.trim());
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  }, [email, password, name, signUpEmail, router]);

  return (
    <SafeAreaView style={styles.c} testID="register-screen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="register-back">
            <ArrowLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <Text style={styles.h1}>JOIN THE HUDDLE</Text>
          <Text style={styles.sub}>Create your account to find matches & teammates</Text>

          <View style={styles.inputWrap}>
            <User color={colors.textSecondary} size={18} />
            <TextInput
              placeholder="Display name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={styles.input}
              testID="register-name-input"
            />
          </View>
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
              testID="register-email-input"
            />
          </View>
          <View style={styles.inputWrap}>
            <Lock color={colors.textSecondary} size={18} />
            <TextInput
              placeholder="Password (min 6)"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              testID="register-password-input"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={submit}
            disabled={busy}
            testID="register-submit-button"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>CREATE ACCOUNT</Text>}
          </TouchableOpacity>

          <Link href="/login" asChild>
            <TouchableOpacity style={styles.linkRow} testID="register-go-login">
              <Text style={styles.linkText}>
                Already have an account?{" "}
                <Text style={{ color: colors.voltBlue, fontWeight: "700" }}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.md, paddingBottom: space.xl * 2 },
  back: {
    width: 40, height: 40, borderRadius: radii.md, alignItems: "center",
    justifyContent: "center", backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border, marginBottom: space.lg,
  },
  h1: { fontFamily: "BebasNeue_400Regular", fontSize: 44, color: colors.text, letterSpacing: 2 },
  sub: { color: colors.textSecondary, marginTop: space.xs, marginBottom: space.xl, fontFamily: "DMSans_400Regular" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.bgSecondary, borderRadius: radii.md, paddingHorizontal: space.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: space.md, height: 52,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, fontFamily: "DMSans_400Regular", height: 52 },
  primaryBtn: {
    backgroundColor: colors.voltBlue, borderRadius: radii.md, height: 52,
    alignItems: "center", justifyContent: "center", marginTop: space.sm,
  },
  primaryBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 16, letterSpacing: 1.5 },
  linkRow: { alignItems: "center", marginTop: space.lg },
  linkText: { color: colors.textSecondary },
});
