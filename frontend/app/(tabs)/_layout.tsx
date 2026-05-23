import { Tabs } from "expo-router";
import { Compass, Shield, MessageSquare, User as UserIcon, CalendarDays } from "lucide-react-native";
import { Platform } from "react-native";
import { colors } from "@/src/theme";

type IconArgs = { color: string; size: number };

const CompassIcon = ({ color, size }: IconArgs) => <Compass color={color} size={size} />;
const CalendarIcon = ({ color, size }: IconArgs) => <CalendarDays color={color} size={size} />;
const ShieldIcon = ({ color, size }: IconArgs) => <Shield color={color} size={size} />;
const ChatIcon = ({ color, size }: IconArgs) => <MessageSquare color={color} size={size} />;
const UserTabIcon = ({ color, size }: IconArgs) => <UserIcon color={color} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
        },
        tabBarActiveTintColor: colors.voltBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 1 },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: "DISCOVER", tabBarIcon: CompassIcon }} />
      <Tabs.Screen name="matches" options={{ title: "MATCHES", tabBarIcon: CalendarIcon }} />
      <Tabs.Screen name="teams" options={{ title: "TEAMS", tabBarIcon: ShieldIcon }} />
      <Tabs.Screen name="chats" options={{ title: "CHATS", tabBarIcon: ChatIcon }} />
      <Tabs.Screen name="profile" options={{ title: "PROFILE", tabBarIcon: UserTabIcon }} />
    </Tabs>
  );
}
