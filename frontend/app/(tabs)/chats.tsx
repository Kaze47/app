// Chats tab: shows matches the user has joined (each match has a chat thread)
import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { MessageSquare, ChevronRight } from "lucide-react-native";

import { colors, radii, space } from "@/src/theme";
import { api, type ApiMatch } from "@/src/api";

export default function ChatsTab() {
  const router = useRouter();
  const [items, setItems] = useState<ApiMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.listMatches({ mine: true });
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

  return (
    <SafeAreaView edges={["top"]} style={styles.c} testID="chats-tab">
      <View style={styles.header}>
        <Text style={styles.h1}>CHATS</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.voltBlue} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <MessageSquare color={colors.textMuted} size={48} />
          <Text style={styles.empty}>Join a match to start chatting</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/chat/${item.id}`)}
              testID={`chat-row-${item.id}`}
            >
              <View style={styles.iconWrap}>
                <MessageSquare color={colors.voltBlue} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.sport} · {item.location_name}
                </Text>
              </View>
              <ChevronRight color={colors.textMuted} size={18} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm },
  h1: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 40, letterSpacing: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  empty: { color: colors.textSecondary },
  row: {
    flexDirection: "row", gap: space.md, alignItems: "center",
    backgroundColor: colors.bgSecondary, padding: space.md, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: space.sm,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: radii.md, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,122,255,0.12)", borderWidth: 1, borderColor: "rgba(0,122,255,0.3)",
  },
  title: { color: colors.text, fontFamily: "DMSans_700Bold", fontSize: 16 },
  meta: { color: colors.textSecondary, fontFamily: "DMSans_400Regular", fontSize: 13 },
});
