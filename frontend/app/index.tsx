import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth-context";
import { colors } from "@/src/theme";

export default function Index() {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (!user.preferred_sports || user.preferred_sports.length === 0) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)/discover");
      }
    } else {
      router.replace("/login");
    }
  }, [loading, user, router]);

  return (
    <View style={styles.c} testID="splash-screen">
      <ActivityIndicator color={colors.voltBlue} />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
