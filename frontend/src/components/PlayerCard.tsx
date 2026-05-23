// Player swipe card (used inside react-native-deck-swiper)
import { View, Text, StyleSheet, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Award } from "lucide-react-native";
import { colors, radii, space } from "@/src/theme";
import type { ApiUser } from "@/src/api";

const FALLBACK = "https://images.unsplash.com/photo-1610041321420-a596dd14ebc9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwzfHxlc3BvcnRzJTIwZ2FtaW5nJTIwbmVvbiUyMGRhcmt8ZW58MHx8fHwxNzc5NTcyNDQyfDA&ixlib=rb-4.1.0&q=85";

export function PlayerCard({ user }: { user: ApiUser }) {
  return (
    <View style={styles.card} testID={`player-card-${user.user_id}`}>
      <ImageBackground source={{ uri: user.photo_url || FALLBACK }} style={styles.img}>
        <LinearGradient
          colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.4)", "rgba(10,10,10,1)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <Text style={styles.name}>{(user.display_name || "PLAYER").toUpperCase()}</Text>
          {user.location_name ? (
            <View style={styles.metaRow}>
              <MapPin color={colors.text} size={14} />
              <Text style={styles.metaText}>{user.location_name}</Text>
            </View>
          ) : null}
          {user.skill_level ? (
            <View style={styles.metaRow}>
              <Award color={colors.voltBlue} size={14} />
              <Text style={[styles.metaText, { color: colors.voltBlue }]}>{user.skill_level}</Text>
            </View>
          ) : null}
          {user.bio ? <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text> : null}
          <View style={styles.tagsRow}>
            {(user.preferred_sports || []).slice(0, 4).map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  img: { flex: 1, justifyContent: "flex-end" },
  content: { padding: space.lg, gap: 8 },
  name: { fontFamily: "BebasNeue_400Regular", fontSize: 40, color: colors.text, letterSpacing: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { color: colors.text, fontFamily: "DMSans_500Medium", fontSize: 14 },
  bio: { color: colors.textSecondary, fontSize: 14, fontFamily: "DMSans_400Regular", marginTop: 4 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  tag: {
    backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radii.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  tagText: { color: colors.text, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 0.5 },
});
