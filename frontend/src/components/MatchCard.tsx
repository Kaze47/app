// Reusable match list card
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Users, CalendarClock, Gamepad2, Trophy } from "lucide-react-native";
import { colors, radii, space, isGamingSport } from "@/src/theme";
import type { ApiMatch } from "@/src/api";

export function MatchCard({ match, onPress }: { match: ApiMatch; onPress: () => void }) {
  const gaming = isGamingSport(match.sport);
  const accent = gaming ? colors.voltBlue : colors.blaze;
  const Icon = gaming ? Gamepad2 : Trophy;
  const dt = new Date(match.date_time);
  const dateStr = dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeStr = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const filled = `${match.participants?.length || 0}/${match.max_players}`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      testID={`match-card-${match.id}`}
      style={styles.card}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      {match.cover_image ? (
        <ImageBackground source={{ uri: match.cover_image }} style={styles.imgWrap} imageStyle={{ borderRadius: 0 }}>
          <LinearGradient
            colors={["rgba(20,20,20,0)", "rgba(20,20,20,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      ) : null}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.sportPill, { borderColor: accent }]}>
            <Icon color={accent} size={12} />
            <Text style={[styles.sportPillText, { color: accent }]}>{match.sport.toUpperCase()}</Text>
          </View>
          <Text style={styles.filledText}>{filled}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{match.title}</Text>
        <View style={styles.metaRow}>
          <MapPin color={colors.textSecondary} size={14} />
          <Text style={styles.metaText} numberOfLines={1}>{match.location_name}</Text>
        </View>
        <View style={styles.metaRow}>
          <CalendarClock color={colors.textSecondary} size={14} />
          <Text style={styles.metaText}>{dateStr} · {timeStr}</Text>
        </View>
        <View style={styles.metaRow}>
          <Users color={colors.textSecondary} size={14} />
          <Text style={styles.metaText}>{match.participants?.length || 0} joined</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.md,
    overflow: "hidden",
    flexDirection: "row",
  },
  accent: { width: 4 },
  imgWrap: { width: 90 },
  content: { flex: 1, padding: space.md, gap: 6 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sportPill: {
    flexDirection: "row", gap: 6, alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm,
    borderWidth: 1, backgroundColor: "rgba(0,122,255,0.08)",
  },
  sportPillText: { fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 1 },
  filledText: { color: colors.text, fontFamily: "DMSans_700Bold" },
  title: {
    color: colors.text, fontFamily: "DMSans_700Bold", fontSize: 17, marginTop: 4,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { color: colors.textSecondary, fontSize: 13, fontFamily: "DMSans_400Regular" },
});
