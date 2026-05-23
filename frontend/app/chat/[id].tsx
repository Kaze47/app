// Real-time chat for a match (WebSocket)
import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Send } from "lucide-react-native";

import { colors, radii, space } from "@/src/theme";
import { api, wsChatUrl, type ApiMessage, getStoredToken } from "@/src/api";
import { useAuth } from "@/src/auth-context";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<FlatList<ApiMessage>>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.listMessages(id);
        if (!alive) return;
        setMessages(r.items);
      } catch {} finally {
        if (alive) setLoading(false);
        scrollToEnd();
      }
      const token = await getStoredToken();
      if (!token || !alive) return;
      const ws = new WebSocket(wsChatUrl(id, token));
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload.type === "message" && payload.data) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === payload.data.id)) return prev;
              return [...prev, payload.data];
            });
            scrollToEnd();
          }
        } catch {}
      };
    })();
    return () => {
      alive = false;
      wsRef.current?.close();
    };
  }, [id, scrollToEnd]);

  const send = useCallback(async () => {
    const t = text.trim();
    if (!t || !id) return;
    setText("");
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ text: t }));
    } else {
      // Fallback to REST if WS not ready
      try {
        const r = await api.sendMessage(id, t);
        setMessages((prev) => [...prev, r.message]);
        scrollToEnd();
      } catch {}
    }
  }, [text, id, scrollToEnd]);

  if (loading) {
    return (
      <SafeAreaView style={styles.c}>
        <ActivityIndicator color={colors.voltBlue} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.c} testID={`chat-screen-${id}`}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>MATCH CHAT</Text>
          <Text style={styles.status}>
            {connected ? "● live" : "○ offline"}
          </Text>
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.md, gap: 8 }}
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.user_id;
            return (
              <View
                style={[
                  styles.bubbleRow,
                  { justifyContent: mine ? "flex-end" : "flex-start" },
                ]}
                testID={`chat-msg-${item.id}`}
              >
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleOther,
                  ]}
                >
                  {!mine && item.sender_name ? (
                    <Text style={styles.senderName}>{item.sender_name}</Text>
                  ) : null}
                  <Text style={mine ? styles.textMine : styles.textOther}>{item.text}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={styles.composer}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            style={styles.input}
            multiline
            testID="chat-input"
            onSubmitEditing={send}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send} testID="chat-send-btn">
            <Send color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: space.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: {
    width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.text, fontFamily: "BebasNeue_400Regular", fontSize: 22, letterSpacing: 2 },
  status: { color: colors.textSecondary, fontFamily: "DMSans_500Medium", fontSize: 11 },
  bubbleRow: { flexDirection: "row" },
  bubble: {
    maxWidth: "78%", padding: 12, borderRadius: radii.lg,
  },
  bubbleMine: {
    backgroundColor: colors.voltBlue, borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#27272A", borderBottomLeftRadius: 4,
  },
  senderName: { color: colors.textSecondary, fontSize: 11, fontFamily: "DMSans_700Bold", marginBottom: 2 },
  textMine: { color: "#fff", fontFamily: "DMSans_400Regular", fontSize: 15 },
  textOther: { color: colors.text, fontFamily: "DMSans_400Regular", fontSize: 15 },
  composer: {
    flexDirection: "row", padding: space.md, gap: 8, alignItems: "flex-end",
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgSecondary,
  },
  input: {
    flex: 1, color: colors.text, fontFamily: "DMSans_400Regular", fontSize: 15,
    backgroundColor: colors.bg, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, minHeight: 44, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.voltBlue,
    alignItems: "center", justifyContent: "center",
  },
});
