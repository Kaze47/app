// Teams tab: list mine, join via invite code, create new
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Plus, Shield, UserPlus } from "lucide-react-native";

import { colors, radii, space } from "@/src/theme";
import { api, type ApiTeam } from "@/src/api";

export default function TeamsTab() {
  const router = useRouter();
  const [items, setItems] = useState<ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.listTeams(true);
      setItems(r.items);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const joinByCode = useCallback(async () => {
    if (!inviteCode.trim()) return;
    try {
      const r = await api.joinTeam(inviteCode.trim());
      setInviteCode("");
      await load();
      router.push(`/team/${r.team.id}`);
    } catch (e: any) {
      Alert.alert("Could not join", e.message || "Invalid invite code");
    }
  }, [inviteCode, load, router]);

  return (
    <SafeAreaView edges={["top"]} style={styles.c} testID="teams-tab">
      <View style={styles.header}>
        <Text style={styles.h1}>TEAMS</Text>
        <TouchableOpacity
          onPress={() => router.push("/team/create")}
          style={styles.headerBtn}
          testID="teams-create-btn"
        >
          <Plus color={colors.text} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.inviteRow}>
        <View style={styles.inviteInputWrap}>
          <UserPlus color={colors.textSecondary} size={18} />
          <TextInput
            placeholder="Paste invite code"
            placeholderTextColor={colors.textMuted}
            value={inviteCode}
            onChangeText={setInviteCode}
            style={styles.inviteInput}
            autoCapitalize="none"
            testID="teams-invite-input"
          />
        </View>
        <TouchableOpacity style={styles.joinBtn} onPress={joinByCode} testID="teams-join-btn">
          <Text style={styles.joinBtnText}>JOIN</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.voltBlue} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Shield color={colors.textMuted} size={48} />
          <Text style={styles.empty}>You're not on a team yet</Text>
          <TouchableOpacity onPress={() => router.push("/team/create")} style={styles.cta}>
            <Text style={styles.ctaText}>CREATE YOUR TEAM</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: space.md, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.voltBlue} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.teamCard}
              onPress={() => router.push(`/team/${item.id}`)}
              testID={`team-card-${item.id}`}
            >
              <View style={styles.shieldWrap}>
                <Shield color={colors.voltBlue} size={28} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>{item.team_name.toUpperCase()}</Text>
                <Text style={styles.teamMeta}>{item.sport} · {item.members.length} member{item.members.length === 1 ? "" : "s"}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: space.md, paddingTop: space.md,
  },
  h1: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 40, letterSpacing: 2 },
  headerBtn: {
    width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  inviteRow: { flexDirection: "row", paddingHorizontal: space.md, marginTop: space.md, gap: 8 },
  inviteInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.bgSecondary, borderRadius: radii.md,
    paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.border, height: 48,
  },
  inviteInput: { flex: 1, color: colors.text, fontFamily: "DMSans_400Regular", height: 48 },
  joinBtn: {
    paddingHorizontal: 18, justifyContent: "center", borderRadius: radii.md,
    backgroundColor: colors.voltBlue,
  },
  joinBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", letterSpacing: 1.2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  empty: { color: colors.textSecondary },
  cta: { backgroundColor: colors.voltBlue, paddingHorizontal: space.lg, paddingVertical: 14, borderRadius: radii.md, marginTop: 8 },
  ctaText: { color: "#fff", fontFamily: "DMSans_700Bold", letterSpacing: 1.5 },
  teamCard: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    backgroundColor: colors.bgSecondary, borderRadius: radii.md, padding: space.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: space.md,
  },
  shieldWrap: {
    width: 52, height: 52, borderRadius: radii.md, backgroundColor: "rgba(0,122,255,0.12)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,122,255,0.3)",
  },
  teamName: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 22, letterSpacing: 2 },
  teamMeta: { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
});
