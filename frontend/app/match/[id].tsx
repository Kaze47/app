// Match detail with Join/Leave + chat entry
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowLeft, MapPin, CalendarClock, Users, MessageSquare, LogOut } from "lucide-react-native";

import { colors, radii, space, isGamingSport } from "@/src/theme";
import { api, type ApiMatch } from "@/src/api";
import { useAuth } from "@/src/auth-context";

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.getMatch(id);
      setMatch(r.match);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not load match");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const join = useCallback(async () => {
    if (!match) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const r = await api.joinMatch(match.id);
      setMatch(r.match);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Could not join", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  }, [match]);

  const leave = useCallback(async () => {
    if (!match) return;
    setBusy(true);
    try {
      const r = await api.leaveMatch(match.id);
      setMatch(r.match);
    } catch (e: any) {
      Alert.alert("Could not leave", e.message || "Try again");
    } finally {
      setBusy(false);
    }
  }, [match]);

  if (loading) {
    return (
      <SafeAreaView style={styles.c}>
        <ActivityIndicator color={colors.voltBlue} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  if (!match) return <SafeAreaView style={styles.c}><Text style={styles.empty}>Match not found</Text></SafeAreaView>;

  const joined = match.participants.includes(user?.user_id || "");
  const full = match.participants.length >= match.max_players;
  const dt = new Date(match.date_time);
  const accent = isGamingSport(match.sport) ? colors.voltBlue : colors.blaze;

  const cover = match.cover_image ||
    "https://images.unsplash.com/photo-1590227632180-80a3bf110871?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwcGxheWVyJTIwZGFya3xlbnwwfHx8fDE3Nzk1NzI0NDJ8MA&ixlib=rb-4.1.0&q=85";

  return (
    <View style={styles.c} testID={`match-detail-${match.id}`}>
      <ImageBackground source={{ uri: cover }} style={styles.hero}>
        <LinearGradient
          colors={["rgba(10,10,10,0.4)", "rgba(10,10,10,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="match-back">
              <ArrowLeft color={colors.text} size={22} />
            </TouchableOpacity>
            <View style={[styles.sportPill, { borderColor: accent }]}>
              <Text style={[styles.sportPillText, { color: accent }]}>{match.sport.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{match.title}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.metaItem}>
                <Users color={colors.text} size={16} />
                <Text style={styles.metaText}>{match.participants.length}/{match.max_players}</Text>
              </View>
              {match.skill_level ? (
                <View style={styles.metaItem}>
                  <Text style={styles.metaText}>· {match.skill_level}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 200 }}>
        <View style={styles.row}>
          <MapPin color={colors.voltBlue} size={18} />
          <Text style={styles.rowText}>{match.location_name}</Text>
        </View>
        <View style={styles.row}>
          <CalendarClock color={colors.voltBlue} size={18} />
          <Text style={styles.rowText}>
            {dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {"  ·  "}
            {dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </Text>
        </View>

        {match.description ? (
          <>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.desc}>{match.description}</Text>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>PARTICIPANTS ({match.participants.length})</Text>
        <View style={styles.participantsList}>
          {match.participants.map((p) => (
            <View key={p} style={styles.participantPill}>
              <Text style={styles.participantText}>{p === user?.user_id ? "YOU" : p.slice(-6)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {joined ? (
          <>
            <TouchableOpacity
              style={[styles.cta, { flex: 1, backgroundColor: colors.voltBlue }]}
              onPress={() => router.push(`/chat/${match.id}`)}
              testID="match-open-chat"
            >
              <MessageSquare color="#fff" size={18} />
              <Text style={styles.ctaText}>OPEN CHAT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }]}
              onPress={leave}
              disabled={busy}
              testID="match-leave"
            >
              <LogOut color={colors.blaze} size={18} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.cta, { flex: 1, backgroundColor: full ? colors.border : colors.voltBlue }]}
            onPress={join}
            disabled={busy || full}
            testID="match-join"
          >
            <Text style={[styles.ctaText, { color: full ? colors.textMuted : "#fff" }]}>
              {full ? "MATCH FULL" : busy ? "JOINING..." : "JOIN MATCH"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  empty: { color: colors.text, padding: space.lg },
  hero: { height: 280, backgroundColor: colors.bgSecondary },
  heroTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: space.md, paddingTop: space.sm,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: radii.md, backgroundColor: "rgba(10,10,10,0.7)",
    alignItems: "center", justifyContent: "center",
  },
  sportPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.sm, borderWidth: 1,
    backgroundColor: "rgba(10,10,10,0.7)",
  },
  sportPillText: { fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5 },
  heroContent: { padding: space.md, flex: 1, justifyContent: "flex-end" },
  heroTitle: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 42, letterSpacing: 1 },
  heroMeta: { flexDirection: "row", gap: 12, marginTop: 6 },
  metaItem: { flexDirection: "row", gap: 6, alignItems: "center" },
  metaText: { color: colors.text, fontFamily: "DMSans_500Medium" },
  row: {
    flexDirection: "row", gap: 12, alignItems: "center",
    backgroundColor: colors.bgSecondary, padding: space.md,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, marginBottom: space.sm,
  },
  rowText: { color: colors.text, fontFamily: "DMSans_500Medium", flex: 1 },
  sectionLabel: {
    color: colors.textSecondary, fontFamily: "DMSans_700Bold", letterSpacing: 1.4,
    fontSize: 12, marginTop: space.lg, marginBottom: space.sm,
  },
  desc: { color: colors.text, fontFamily: "DMSans_400Regular", lineHeight: 22 },
  participantsList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  participantPill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
  },
  participantText: { color: colors.text, fontFamily: "DMSans_500Medium", fontSize: 12 },
  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    padding: space.md, paddingBottom: space.lg, gap: 8, flexDirection: "row",
    backgroundColor: "rgba(10,10,10,0.95)", borderTopWidth: 1, borderTopColor: colors.border,
  },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingHorizontal: space.md, height: 52, borderRadius: radii.md,
  },
  ctaText: { color: "#fff", fontFamily: "DMSans_700Bold", letterSpacing: 1.5, fontSize: 15 },
});
