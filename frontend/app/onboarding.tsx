import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MapPin, ChevronRight } from "lucide-react-native";

import { colors, radii, space, SPORTS, SKILL_LEVELS } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function Onboarding() {
  const router = useRouter();
  const { updateUser, user, signOut } = useAuth();
  const [selectedSports, setSelectedSports] = useState<string[]>(user?.preferred_sports || []);
  const [skill, setSkill] = useState<string | null>(user?.skill_level || null);
  const [location, setLocation] = useState(user?.location_name || "");
  const [busy, setBusy] = useState(false);

  const toggleSport = useCallback((s: string) => {
    setSelectedSports((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }, []);

  const submit = useCallback(async () => {
    if (selectedSports.length === 0) {
      Alert.alert("Pick a sport", "Choose at least one to continue");
      return;
    }
    setBusy(true);
    try {
      await updateUser({
        preferred_sports: selectedSports,
        skill_level: skill || "Beginner",
        location_name: location.trim() || "Unknown",
      });
      router.replace("/(tabs)/discover");
    } catch (e: any) {
      Alert.alert("Save failed", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  }, [selectedSports, skill, location, updateUser, router]);

  return (
    <SafeAreaView style={styles.c} testID="onboarding-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 100 }}>
          <Text style={styles.h1}>YOUR PROFILE</Text>
          <Text style={styles.sub}>Tell us what you play and where you're based.</Text>

          <Text style={styles.label}>PREFERRED SPORTS</Text>
          <View style={styles.chipsWrap}>
            {SPORTS.map((s) => {
              const active = selectedSports.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleSport(s)}
                  style={[styles.chip, active && styles.chipActive]}
                  testID={`sport-chip-${s}`}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>SKILL LEVEL</Text>
          <View style={styles.chipsWrap}>
            {SKILL_LEVELS.map((s) => {
              const active = skill === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSkill(s)}
                  style={[styles.chip, active && styles.chipActive]}
                  testID={`skill-chip-${s}`}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>LOCATION</Text>
          <View style={styles.inputWrap}>
            <MapPin color={colors.textSecondary} size={18} />
            <TextInput
              placeholder="City or neighborhood"
              placeholderTextColor={colors.textMuted}
              value={location}
              onChangeText={setLocation}
              style={styles.input}
              testID="onboarding-location-input"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={submit}
            disabled={busy}
            testID="onboarding-continue-button"
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.primaryBtnText}>CONTINUE</Text>
                <ChevronRight color="#fff" size={20} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={signOut} style={{ alignItems: "center", marginTop: space.lg }}>
            <Text style={{ color: colors.textMuted }}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  h1: { fontFamily: "BebasNeue_400Regular", fontSize: 44, color: colors.text, letterSpacing: 2 },
  sub: { color: colors.textSecondary, marginTop: space.xs, marginBottom: space.lg, fontFamily: "DMSans_400Regular" },
  label: {
    color: colors.textSecondary, letterSpacing: 1.4, fontFamily: "DMSans_700Bold",
    fontSize: 12, marginTop: space.lg, marginBottom: space.sm,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.voltBlue, borderColor: colors.voltBlue },
  chipText: { color: colors.text, fontFamily: "DMSans_500Medium" },
  chipTextActive: { color: "#fff", fontFamily: "DMSans_700Bold" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.bgSecondary, borderRadius: radii.md, paddingHorizontal: space.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: space.md, height: 52,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, fontFamily: "DMSans_400Regular", height: 52 },
  primaryBtn: {
    backgroundColor: colors.voltBlue, borderRadius: radii.md, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: space.xl, gap: 8,
  },
  primaryBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 16, letterSpacing: 1.5 },
});
