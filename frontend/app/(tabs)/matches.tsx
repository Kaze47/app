// All matches list + create
import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";

import { colors, radii, space } from "@/src/theme";
import { api, type ApiMatch } from "@/src/api";
import { MatchCard } from "@/src/components/MatchCard";

export default function MatchesTab() {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [items, setItems] = useState<ApiMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.listMatches({ mine: tab === "mine" });
      setItems(r.items);
    } catch (e) {
      console.warn(e);
    }
  }, [tab]);

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

  return (
    <SafeAreaView edges={["top"]} style={styles.c} testID="matches-tab">
      <View style={styles.header}>
        <Text style={styles.h1}>MATCHES</Text>
        <TouchableOpacity
          onPress={() => router.push("/match/create")}
          style={styles.headerBtn}
          testID="matches-create-btn"
        >
          <Plus color={colors.text} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.toggle}>
        <TouchableOpacity
          onPress={() => setTab("all")}
          style={[styles.toggleBtn, tab === "all" && styles.toggleBtnActive]}
          testID="matches-tab-all"
        >
          <Text style={[styles.toggleText, tab === "all" && styles.toggleTextActive]}>ALL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("mine")}
          style={[styles.toggleBtn, tab === "mine" && styles.toggleBtnActive]}
          testID="matches-tab-mine"
        >
          <Text style={[styles.toggleText, tab === "mine" && styles.toggleTextActive]}>MY MATCHES</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.voltBlue} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No matches found</Text>
          <TouchableOpacity onPress={() => router.push("/match/create")} style={styles.cta}>
            <Text style={styles.ctaText}>CREATE A MATCH</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.md, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.voltBlue} />
          }
          renderItem={({ item }) => (
            <MatchCard match={item} onPress={() => router.push(`/match/${item.id}`)} />
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
  toggle: {
    flexDirection: "row", backgroundColor: colors.bgSecondary, borderRadius: radii.pill,
    margin: space.md, padding: 4, borderWidth: 1, borderColor: colors.border,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: radii.pill, alignItems: "center" },
  toggleBtnActive: { backgroundColor: colors.voltBlue },
  toggleText: { color: colors.textSecondary, fontFamily: "DMSans_700Bold", letterSpacing: 1.5, fontSize: 13 },
  toggleTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  empty: { color: colors.textSecondary },
  cta: { backgroundColor: colors.voltBlue, paddingHorizontal: space.lg, paddingVertical: 14, borderRadius: radii.md },
  ctaText: { color: "#fff", fontFamily: "DMSans_700Bold", letterSpacing: 1.5 },
});
