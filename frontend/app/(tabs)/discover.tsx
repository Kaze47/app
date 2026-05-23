// Discover: toggle between Matches (list) and Players (swipe stack)
import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList,
  RefreshControl, Dimensions, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Swiper from "react-native-deck-swiper";
import { Heart, X, Plus, Filter } from "lucide-react-native";

import { colors, radii, space } from "@/src/theme";
import { api, type ApiMatch, type ApiUser } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { MatchCard } from "@/src/components/MatchCard";
import { PlayerCard } from "@/src/components/PlayerCard";

type Mode = "matches" | "players";
const { width: SCREEN_W } = Dimensions.get("window");

export default function Discover() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("matches");
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [players, setPlayers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedToast, setMatchedToast] = useState<string | null>(null);
  const swiperRef = useRef<Swiper<ApiUser> | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([api.listMatches(), api.discoverUsers()]);
      setMatches(m.items);
      setPlayers(p.items);
    } catch (e) {
      console.warn("load failed", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onSwipedRight = useCallback(async (idx: number) => {
    const target = players[idx];
    if (!target) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const r = await api.swipe({ target_user_id: target.user_id, direction: "right" });
      if (r.matched) {
        setMatchedToast(target.display_name || "Player");
        setTimeout(() => setMatchedToast(null), 2500);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  }, [players]);

  const onSwipedLeft = useCallback(async (idx: number) => {
    const target = players[idx];
    if (!target) return;
    try {
      await api.swipe({ target_user_id: target.user_id, direction: "left" });
    } catch {}
  }, [players]);

  return (
    <SafeAreaView edges={["top"]} style={styles.c} testID="discover-screen">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>HEY, {(user?.display_name || "PLAYER").toUpperCase()}</Text>
          <Text style={styles.h1}>DISCOVER</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/match/create")}
          style={styles.headerBtn}
          testID="header-create-match"
        >
          <Plus color={colors.text} size={20} />
        </TouchableOpacity>
      </View>

      {/* Segmented toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          onPress={() => setMode("matches")}
          style={[styles.toggleBtn, mode === "matches" && styles.toggleBtnActive]}
          testID="toggle-matches"
        >
          <Text style={[styles.toggleText, mode === "matches" && styles.toggleTextActive]}>
            MATCHES
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("players")}
          style={[styles.toggleBtn, mode === "players" && styles.toggleBtnActive]}
          testID="toggle-players"
        >
          <Text style={[styles.toggleText, mode === "players" && styles.toggleTextActive]}>
            PLAYERS
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.empty}><ActivityIndicator color={colors.voltBlue} /></View>
      ) : mode === "matches" ? (
        matches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>NO MATCHES YET</Text>
            <Text style={styles.emptySub}>Be the first to create one</Text>
            <TouchableOpacity style={styles.cta} onPress={() => router.push("/match/create")} testID="empty-create-match">
              <Text style={styles.ctaText}>CREATE MATCH</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: space.md, paddingBottom: 120 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.voltBlue} />
            }
            renderItem={({ item }) => (
              <MatchCard match={item} onPress={() => router.push(`/match/${item.id}`)} />
            )}
          />
        )
      ) : (
        <View style={styles.swipeArea}>
          {players.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>NO PLAYERS FOUND</Text>
              <Text style={styles.emptySub}>Invite friends to start swiping</Text>
            </View>
          ) : (
            <>
              <Swiper
                ref={(r) => { swiperRef.current = r; }}
                cards={players}
                renderCard={(card) => (card ? <PlayerCard user={card} /> : null)}
                onSwipedRight={onSwipedRight}
                onSwipedLeft={onSwipedLeft}
                cardIndex={0}
                backgroundColor="transparent"
                stackSize={3}
                stackSeparation={-22}
                animateCardOpacity
                verticalSwipe={false}
                cardVerticalMargin={16}
                cardHorizontalMargin={16}
                disableBottomSwipe
                disableTopSwipe
                overlayLabels={{
                  left: {
                    title: "PASS",
                    style: {
                      label: {
                        backgroundColor: colors.blaze, color: "#fff", fontSize: 22,
                        padding: 10, borderRadius: radii.md, fontFamily: "DMSans_700Bold",
                      },
                      wrapper: { flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-start", marginTop: 40, marginLeft: -20 },
                    },
                  },
                  right: {
                    title: "MATCH",
                    style: {
                      label: {
                        backgroundColor: colors.success, color: "#fff", fontSize: 22,
                        padding: 10, borderRadius: radii.md, fontFamily: "DMSans_700Bold",
                      },
                      wrapper: { flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", marginTop: 40, marginLeft: 20 },
                    },
                  },
                }}
              />
              <View style={styles.swipeActions} pointerEvents="box-none">
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                  onPress={() => swiperRef.current?.swipeLeft()}
                  testID="swipe-pass-button"
                >
                  <X color={colors.blaze} size={28} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.voltBlue, borderColor: colors.voltBlue }]}
                  onPress={() => swiperRef.current?.swipeRight()}
                  testID="swipe-like-button"
                >
                  <Heart color="#fff" size={26} fill="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
          {matchedToast ? (
            <View style={styles.toast} testID="match-toast">
              <Text style={styles.toastText}>IT'S A MATCH WITH {matchedToast.toUpperCase()}!</Text>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.md,
  },
  hello: { color: colors.textSecondary, fontFamily: "DMSans_500Medium", fontSize: 12, letterSpacing: 1.5 },
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, gap: 12 },
  emptyTitle: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 26, letterSpacing: 2 },
  emptySub: { color: colors.textSecondary, textAlign: "center" },
  cta: {
    marginTop: space.md, backgroundColor: colors.voltBlue,
    paddingHorizontal: space.lg, paddingVertical: 14, borderRadius: radii.md,
  },
  ctaText: { color: "#fff", fontFamily: "DMSans_700Bold", letterSpacing: 1.5 },
  swipeArea: { flex: 1, position: "relative" },
  swipeActions: {
    position: "absolute", bottom: 28, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 24,
  },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  toast: {
    position: "absolute", top: 16, left: 16, right: 16,
    backgroundColor: colors.success, borderRadius: radii.md, padding: space.md, alignItems: "center",
  },
  toastText: { color: "#fff", fontFamily: "DMSans_700Bold", letterSpacing: 1.5 },
});
