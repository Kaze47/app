// Profile tab
import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut, Save, MapPin, Award } from "lucide-react-native";

import { colors, radii, space, SPORTS, SKILL_LEVELS } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function ProfileTab() {
  const { user, updateUser, signOut } = useAuth();
  const [name, setName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [location, setLocation] = useState(user?.location_name || "");
  const [sports, setSports] = useState<string[]>(user?.preferred_sports || []);
  const [skill, setSkill] = useState<string | null>(user?.skill_level || null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.display_name || "");
      setBio(user.bio || "");
      setLocation(user.location_name || "");
      setSports(user.preferred_sports || []);
      setSkill(user.skill_level || null);
    }
  }, [user]);

  const save = async () => {
    setBusy(true);
    try {
      await updateUser({
        display_name: name,
        bio,
        location_name: location,
        preferred_sports: sports,
        skill_level: skill || undefined,
      });
      Alert.alert("Saved", "Profile updated");
    } catch (e: any) {
      Alert.alert("Save failed", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  };

  const toggleSport = (s: string) =>
    setSports((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <SafeAreaView edges={["top"]} style={styles.c} testID="profile-tab">
      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 160 }}>
        <View style={styles.header}>
          <Text style={styles.h1}>PROFILE</Text>
          <TouchableOpacity onPress={signOut} style={styles.signOut} testID="profile-signout">
            <LogOut color={colors.text} size={18} />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            {user?.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={{ width: 88, height: 88, borderRadius: 44 }} />
            ) : (
              <Text style={styles.avatarLetter}>{(name || "P").slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.provider}>via {user?.auth_provider || "email"}</Text>
          </View>
        </View>

        <Text style={styles.label}>DISPLAY NAME</Text>
        <TextInput
          value={name} onChangeText={setName}
          style={styles.input} placeholderTextColor={colors.textMuted}
          testID="profile-name-input"
        />

        <Text style={styles.label}>BIO</Text>
        <TextInput
          value={bio} onChangeText={setBio} multiline
          style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
          placeholder="Tell others about your game..."
          placeholderTextColor={colors.textMuted}
          testID="profile-bio-input"
        />

        <Text style={styles.label}>LOCATION</Text>
        <View style={styles.locWrap}>
          <MapPin color={colors.textSecondary} size={18} />
          <TextInput
            value={location} onChangeText={setLocation}
            style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, paddingLeft: 8 }]}
            placeholder="City"
            placeholderTextColor={colors.textMuted}
            testID="profile-location-input"
          />
        </View>

        <Text style={styles.label}>SKILL LEVEL</Text>
        <View style={styles.chips}>
          {SKILL_LEVELS.map((s) => {
            const a = skill === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setSkill(s)}
                style={[styles.chip, a && styles.chipActive]}
                testID={`profile-skill-${s}`}
              >
                <Award color={a ? "#fff" : colors.text} size={12} />
                <Text style={[styles.chipText, a && { color: "#fff" }]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>PREFERRED SPORTS</Text>
        <View style={styles.chips}>
          {SPORTS.map((s) => {
            const a = sports.includes(s);
            return (
              <TouchableOpacity
                key={s}
                onPress={() => toggleSport(s)}
                style={[styles.chip, a && styles.chipActive]}
                testID={`profile-sport-${s}`}
              >
                <Text style={[styles.chipText, a && { color: "#fff" }]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={busy} testID="profile-save-btn">
          <Save color="#fff" size={18} />
          <Text style={styles.saveText}>{busy ? "SAVING..." : "SAVE CHANGES"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md },
  h1: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 40, letterSpacing: 2 },
  signOut: {
    width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  avatarRow: { flexDirection: "row", gap: space.md, alignItems: "center", marginBottom: space.lg },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarLetter: { color: colors.voltBlue, fontFamily: "BebasNeue_400Regular", fontSize: 44 },
  email: { color: colors.text, fontFamily: "DMSans_700Bold", fontSize: 16 },
  provider: { color: colors.textSecondary, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 4 },
  label: {
    color: colors.textSecondary, fontFamily: "DMSans_700Bold", fontSize: 11,
    letterSpacing: 1.4, marginTop: space.lg, marginBottom: space.sm,
  },
  input: {
    backgroundColor: colors.bgSecondary, color: colors.text, fontFamily: "DMSans_400Regular",
    paddingHorizontal: space.md, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: space.sm, fontSize: 15,
  },
  locWrap: {
    flexDirection: "row", alignItems: "center", paddingLeft: 14, gap: 0,
    backgroundColor: colors.bgSecondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: space.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", gap: 6, alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.voltBlue, borderColor: colors.voltBlue },
  chipText: { color: colors.text, fontFamily: "DMSans_500Medium" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.voltBlue, borderRadius: radii.md, height: 52, marginTop: space.xl,
  },
  saveText: { color: "#fff", fontFamily: "DMSans_700Bold", letterSpacing: 1.5 },
});
