// Create team
import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Shield } from "lucide-react-native";

import { colors, radii, space, SPORTS } from "@/src/theme";
import { api } from "@/src/api";

export default function CreateTeam() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [sport, setSport] = useState<string>("Basketball");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!teamName.trim()) {
      Alert.alert("Missing", "Team name is required");
      return;
    }
    setBusy(true);
    try {
      const r = await api.createTeam({
        team_name: teamName.trim(),
        sport,
        description: description.trim() || undefined,
      });
      router.replace(`/team/${r.team.id}`);
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.c} testID="create-team-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <ArrowLeft color={colors.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.h1}>NEW TEAM</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.md }}>
          <View style={styles.heroIcon}>
            <Shield color={colors.voltBlue} size={56} />
          </View>

          <Text style={styles.label}>TEAM NAME</Text>
          <TextInput
            value={teamName} onChangeText={setTeamName}
            placeholder="e.g. Court Kings"
            placeholderTextColor={colors.textMuted} style={styles.input}
            testID="create-team-name"
          />

          <Text style={styles.label}>SPORT</Text>
          <View style={styles.chips}>
            {SPORTS.map((s) => {
              const a = sport === s;
              return (
                <TouchableOpacity
                  key={s} onPress={() => setSport(s)}
                  style={[styles.chip, a && styles.chipActive]}
                  testID={`create-team-sport-${s}`}
                >
                  <Text style={[styles.chipText, a && { color: "#fff" }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            value={description} onChangeText={setDescription} multiline
            placeholder="What's your team about?"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { height: 96, textAlignVertical: "top", paddingTop: 12 }]}
            testID="create-team-desc"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={submit} disabled={busy}
            testID="create-team-submit"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>CREATE TEAM</Text>}
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
  heroIcon: {
    alignSelf: "center", width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(0,122,255,0.12)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(0,122,255,0.3)", marginVertical: space.md,
  },
  label: {
    color: colors.textSecondary, fontFamily: "DMSans_700Bold", fontSize: 11,
    letterSpacing: 1.4, marginTop: space.md, marginBottom: space.sm,
  },
  input: {
    backgroundColor: colors.bgSecondary, color: colors.text, fontFamily: "DMSans_400Regular",
    paddingHorizontal: space.md, height: 48, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, fontSize: 15,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.voltBlue, borderColor: colors.voltBlue },
  chipText: { color: colors.text, fontFamily: "DMSans_500Medium" },
  primaryBtn: {
    backgroundColor: colors.voltBlue, height: 54, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center", marginTop: space.xl,
  },
  primaryBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 16, letterSpacing: 1.5 },
});
