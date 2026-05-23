// API client using EXPO_PUBLIC_BACKEND_URL
import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";
export const TOKEN_KEY = "sports_token";

export type ApiUser = {
  user_id: string;
  email?: string;
  display_name?: string;
  photo_url?: string | null;
  preferred_sports?: string[];
  skill_level?: string | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bio?: string | null;
  auth_provider?: string;
};

export type ApiMatch = {
  id: string;
  creator_id: string;
  sport: string;
  title: string;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  date_time: string;
  max_players: number;
  participants: string[];
  skill_level?: string | null;
  description?: string | null;
  cover_image?: string | null;
  created_at: string;
};

export type ApiTeam = {
  id: string;
  team_name: string;
  sport: string;
  description?: string | null;
  members: string[];
  creator_id: string;
  invite_code?: string;
  created_at: string;
};

export type ApiMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  sender_name?: string;
  sender_photo?: string | null;
  text: string;
  created_at: string;
};

async function getToken(): Promise<string | null> {
  return await storage.secureGet<string>(TOKEN_KEY, "");
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const api = {
  // auth
  register: (body: { email: string; password: string; display_name: string }) =>
    request<{ token: string; user: ApiUser }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: ApiUser }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  sessionLogin: (session_token: string) =>
    request<{ token: string; user: ApiUser }>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ session_token }),
    }),
  me: () => request<{ user: ApiUser }>("/auth/me"),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  // users
  updateMe: (body: Partial<ApiUser>) =>
    request<{ user: ApiUser }>("/users/me", { method: "PUT", body: JSON.stringify(body) }),
  discoverUsers: (params: { sport?: string; location?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.sport) qs.set("sport", params.sport);
    if (params.location) qs.set("location", params.location);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ items: ApiUser[] }>(`/users/discover${suffix}`);
  },
  swipe: (body: { target_user_id: string; direction: "right" | "left" }) =>
    request<{ ok: boolean; matched: boolean }>("/users/swipe", { method: "POST", body: JSON.stringify(body) }),
  getUser: (uid: string) => request<{ user: ApiUser }>(`/users/${uid}`),

  // matches
  listMatches: (params: { sport?: string; mine?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.sport) qs.set("sport", params.sport);
    if (params.mine) qs.set("mine", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ items: ApiMatch[] }>(`/matches${suffix}`);
  },
  createMatch: (body: {
    sport: string;
    title: string;
    location_name: string;
    date_time: string;
    max_players: number;
    skill_level?: string;
    description?: string;
    cover_image?: string;
  }) => request<{ match: ApiMatch }>("/matches", { method: "POST", body: JSON.stringify(body) }),
  getMatch: (id: string) => request<{ match: ApiMatch }>(`/matches/${id}`),
  joinMatch: (id: string) =>
    request<{ match: ApiMatch; already_joined: boolean }>(`/matches/${id}/join`, { method: "POST" }),
  leaveMatch: (id: string) => request<{ match: ApiMatch }>(`/matches/${id}/leave`, { method: "POST" }),

  // teams
  listTeams: (mine = true) => request<{ items: ApiTeam[] }>(`/teams?mine=${mine}`),
  createTeam: (body: { team_name: string; sport: string; description?: string }) =>
    request<{ team: ApiTeam }>("/teams", { method: "POST", body: JSON.stringify(body) }),
  getTeam: (id: string) => request<{ team: ApiTeam }>(`/teams/${id}`),
  regenInvite: (id: string) =>
    request<{ team: ApiTeam }>(`/teams/${id}/regenerate-invite`, { method: "POST" }),
  joinTeam: (code: string) => request<{ team: ApiTeam }>(`/teams/join/${code}`, { method: "POST" }),

  // chat
  listMessages: (matchId: string) => request<{ items: ApiMessage[] }>(`/matches/${matchId}/messages`),
  sendMessage: (matchId: string, text: string) =>
    request<{ message: ApiMessage }>(`/matches/${matchId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};

export function wsChatUrl(matchId: string, token: string) {
  // Convert https → wss; backend is mounted on same host with /api prefix
  const httpBase = BASE.replace(/\/$/, "");
  const wsBase = httpBase.replace(/^http/, "ws");
  return `${wsBase}/api/ws/chat/${matchId}?token=${encodeURIComponent(token)}`;
}

export async function getStoredToken() {
  return await getToken();
}
