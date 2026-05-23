// Create match
import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { colors, radii, space, SPORTS, SKILL_LEVELS } from "@/src/theme";
import { api } from "@/src/api";

export default function CreateMatch() {
  const router = useRouter();
  const [sport, setSport] = useState<string>("Basketball");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [hoursFromNow, setHoursFromNow] = useState("24");
  const [maxPlayers, setMaxPlayers] = useState("8");
  const [skill, setSkill] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert("Missing", "Title and location are required");
      return;
    }
    const hours = parseInt(hoursFromNow, 10);
    const maxP = parseInt(maxPlayers, 10);
    if (Number.isNaN(hours) || Number.isNaN(maxP)) {
      Alert.alert("Invalid number", "Hours and max players must be numbers");
      return;
    }
    const date = new Date(Date.now() + hours * 60 * 60 * 1000);
    setBusy(true);
    try {
      const r = await api.createMatch({
        sport,
        title: title.trim(),
        location_name: location.trim(),
        date_time: date.toISOString(),
        max_players: maxP,
        skill_level: skill || undefined,
        description: description.trim() || undefined,
      });
      router.replace(`/match/${r.match.id}`);
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.c} testID="create-match-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <ArrowLeft color={colors.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.h1}>NEW MATCH</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 120 }}>
          <Text style={styles.label}>SPORT</Text>
          <View style={styles.chips}>
            {SPORTS.map((s) => {
              const a = sport === s;
              return (
                <TouchableOpacity
                  key={s} onPress={() => setSport(s)}
                  style={[styles.chip, a && styles.chipActive]}
                  testID={`create-sport-${s}`}
                >
                  <Text style={[styles.chipText, a && { color: "#fff" }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>TITLE</Text>
          <TextInput
            value={title} onChangeText={setTitle}
            placeholder="e.g. Saturday morning pickup"
            placeholderTextColor={colors.textMuted} style={styles.input}
            testID="create-title-input"
          />

          <Text style={styles.label}>LOCATION</Text>
          <TextInput
            value={location} onChangeText={setLocation}
            placeholder="e.g. Central Park - Court #3"
            placeholderTextColor={colors.textMuted} style={styles.input}
            testID="create-location-input"
          />

          <View style={{ flexDirection: "row", gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>STARTS IN (HOURS)</Text>
              <TextInput
                value={hoursFromNow} onChangeText={setHoursFromNow}
                keyboardType="numeric" style={styles.input}
                testID="create-hours-input"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>MAX PLAYERS</Text>
              <TextInput
                value={maxPlayers} onChangeText={setMaxPlayers}
                keyboardType="numeric" style={styles.input}
                testID="create-max-input"
              />
            </View>
          </View>

          <Text style={styles.label}>SKILL LEVEL (OPTIONAL)</Text>
          <View style={styles.chips}>
            {SKILL_LEVELS.map((s) => {
              const a = skill === s;
              return (
                <TouchableOpacity
                  key={s} onPress={() => setSkill(skill === s ? null : s)}
                  style={[styles.chip, a && styles.chipActive]}
                  testID={`create-skill-${s}`}
                >
                  <Text style={[styles.chipText, a && { color: "#fff" }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            value={description} onChangeText={setDescription}
            placeholder="Bring your own ball, casual vibe"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[styles.input, { height: 96, textAlignVertical: "top", paddingTop: 12 }]}
            testID="create-desc-input"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={submit} disabled={busy}
            testID="create-submit-btn"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>CREATE MATCH</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.md },
  back: {
    width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  h1: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 36, letterSpacing: 2 },
  label: {
    color: colors.textSecondary, fontFamily: "DMSans_700Bold", fontSize: 11,
    letterSpacing: 1.4, marginTop: space.md, marginBottom: space.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.voltBlue, borderColor: colors.voltBlue },
  chipText: { color: colors.text, fontFamily: "DMSans_500Medium" },
  input: {
    backgroundColor: colors.bgSecondary, color: colors.text, fontFamily: "DMSans_400Regular",
    paddingHorizontal: space.md, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: colors.voltBlue, height: 54, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center", marginTop: space.xl,
  },
  primaryBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 16, letterSpacing: 1.5 },
});
