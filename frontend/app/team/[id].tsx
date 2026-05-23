// Team detail with invite link share
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, Share, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Copy, Share2, RefreshCw, Shield, Users } from "lucide-react-native";

import { colors, radii, space } from "@/src/theme";
import { api, type ApiTeam } from "@/src/api";

function buildInviteLink(code: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/team/invite/${code}`;
  }
  const base = process.env.EXPO_PUBLIC_BACKEND_URL || "https://app.example.com";
  return `${base}/team/invite/${code}`;
}

export default function TeamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<ApiTeam | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.getTeam(id);
      setTeam(r.team);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const link = team?.invite_code ? buildInviteLink(team.invite_code) : "";

  const copy = async () => {
    if (!team?.invite_code) return;
    await Clipboard.setStringAsync(team.invite_code);
    Alert.alert("Copied", "Invite code copied to clipboard");
  };

  const doShare = async () => {
    if (!team) return;
    try {
      await Share.share({
        message: `Join my ${team.sport} team "${team.team_name}" on Huddle! Use invite code: ${team.invite_code}\n${link}`,
      });
    } catch {}
  };

  const regen = async () => {
    if (!team) return;
    try {
      const r = await api.regenInvite(team.id);
      setTeam(r.team);
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Try again");
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.c}><ActivityIndicator color={colors.voltBlue} style={{ marginTop: 40 }} /></SafeAreaView>;
  }
  if (!team) return <SafeAreaView style={styles.c}><Text style={{ color: colors.text, padding: 16 }}>Not found</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.c} testID={`team-detail-${team.id}`}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 100 }}>
        <View style={styles.hero}>
          <View style={styles.shieldBig}>
            <Shield color={colors.voltBlue} size={48} />
          </View>
          <Text style={styles.h1}>{team.team_name.toUpperCase()}</Text>
          <Text style={styles.subtitle}>{team.sport} · {team.members.length} member{team.members.length === 1 ? "" : "s"}</Text>
          {team.description ? <Text style={styles.desc}>{team.description}</Text> : null}
        </View>

        <Text style={styles.label}>INVITE CODE</Text>
        <View style={styles.codeBox}>
          <Text style={styles.code} testID="team-invite-code">{team.invite_code}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={copy} style={styles.smallBtn} testID="team-copy-code">
              <Copy color={colors.text} size={16} />
            </TouchableOpacity>
            <TouchableOpacity onPress={regen} style={styles.smallBtn} testID="team-regen-code">
              <RefreshCw color={colors.text} size={16} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={doShare} testID="team-share-btn">
          <Share2 color="#fff" size={18} />
          <Text style={styles.shareText}>SHARE INVITE</Text>
        </TouchableOpacity>

        <Text style={styles.label}>MEMBERS</Text>
        {team.members.map((m) => (
          <View key={m} style={styles.memberRow}>
            <Users color={colors.voltBlue} size={16} />
            <Text style={styles.memberText}>
              {m === team.creator_id ? `${m.slice(-6)} (creator)` : m.slice(-6)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: { padding: space.md },
  back: {
    width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  hero: { alignItems: "center", paddingVertical: space.lg, gap: 8 },
  shieldBig: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(0,122,255,0.12)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,122,255,0.3)",
  },
  h1: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 36, letterSpacing: 2, marginTop: space.sm },
  subtitle: { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
  desc: { color: colors.text, fontFamily: "DMSans_400Regular", textAlign: "center", marginTop: space.sm },
  label: {
    color: colors.textSecondary, fontFamily: "DMSans_700Bold", fontSize: 11,
    letterSpacing: 1.4, marginTop: space.lg, marginBottom: space.sm,
  },
  codeBox: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.bgSecondary, padding: space.md, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
  },
  code: { color: colors.voltBlue, fontFamily: "DMSans_700Bold", fontSize: 18, letterSpacing: 2 },
  smallBtn: {
    width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.bg,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.voltBlue, height: 52, borderRadius: radii.md, marginTop: space.md,
  },
  shareText: { color: "#fff", fontFamily: "DMSans_700Bold", letterSpacing: 1.5 },
  memberRow: {
    flexDirection: "row", gap: 10, alignItems: "center",
    backgroundColor: colors.bgSecondary, padding: space.md, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: space.sm,
  },
  memberText: { color: colors.text, fontFamily: "DMSans_500Medium" },
});
