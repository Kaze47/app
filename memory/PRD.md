# Huddle — Sports & Gaming Community App

## Vision
A mobile-native community app that helps athletes & gamers **find matches, swipe through nearby players, build teams, and chat in real-time**. Performance Pro aesthetic — tactical minimalism on dark.

## Stack
- **Frontend**: React Native (Expo SDK 54) + Expo Router file-based routing
- **Backend**: FastAPI + Motor (MongoDB async)
- **Auth**: JWT email/password + Emergent-managed Google OAuth (both supported)
- **Realtime**: WebSocket per-match chat (`/api/ws/chat/:match_id`)
- **State**: React Context (`AuthProvider`)

## Core Features (all implemented in v1)
1. **Authentication** — Email/password (JWT) + Google social via Emergent.
2. **Dual-Mode Discovery** — Segmented toggle on the Discover tab between:
   - **Matches list** (FlatList from `/api/matches`)
   - **Players swipe stack** (`react-native-deck-swiper`, haptic on right swipe, "match" overlay)
3. **Match Management** — Create, list (all/mine), detail, join/leave (`$addToSet` on participants), max-players enforcement.
4. **Teams & Duo** — Create team → unique invite code (`secrets.token_urlsafe`), regenerate, copy/share via native `Share`, join via code.
5. **Real-time Chat** — Per-match chat: REST history + WebSocket broadcast. Send via WS with REST fallback.
6. **Profile** — Sports, skill level, location, bio, avatar (Google or initial), with sign-out.

## Data Model (MongoDB)
- `users`: `user_id` (custom), `email`, `display_name`, `photo_url`, `preferred_sports[]`, `skill_level`, `location_name`, `bio`, `auth_provider`, `password_hash?`
- `matches`: `id`, `creator_id`, `sport`, `title`, `location_name`, `date_time`, `max_players`, `participants[]`, `skill_level?`, `description?`, `cover_image?`
- `teams`: `id`, `team_name`, `sport`, `description?`, `creator_id`, `members[]`, `invite_code`
- `messages`: `id`, `match_id`, `sender_id`, `sender_name`, `sender_photo`, `text`, `created_at`
- `swipes`: `swiper_id`, `target_user_id`, `direction`
- `user_sessions`: `session_token`, `user_id`, `expires_at` (TTL index)

## Folder Structure
```
/app/backend/
  server.py                     # FastAPI app + all routes + WS
  seed_data.py                  # Idempotent demo data
/app/frontend/
  app/
    _layout.tsx                 # Root: Auth + Fonts + GestureHandler
    index.tsx                   # Auth gate / splash
    login.tsx, register.tsx     # Auth screens
    onboarding.tsx              # Sport/skill/location setup
    (tabs)/
      _layout.tsx               # Bottom tabs
      discover.tsx              # Toggle (Matches list / Players swipe)
      matches.tsx               # All + mine
      teams.tsx                 # My teams + join-by-code
      chats.tsx                 # Joined matches
      profile.tsx               # Edit profile + sign out
    match/[id].tsx              # Detail, join/leave, open chat
    match/create.tsx
    team/[id].tsx               # Invite code, share, members
    team/create.tsx
    chat/[id].tsx               # Per-match WebSocket chat
  src/
    api.ts                      # Typed fetch client + WS URL builder
    theme.ts                    # Colors, radii, spacing, sport lists
    auth-context.tsx            # AuthProvider (JWT + Google session)
    components/MatchCard.tsx
    components/PlayerCard.tsx
```

## Key Endpoints
- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/session` (Google) · `GET /api/auth/me` · `POST /api/auth/logout`
- `PUT /api/users/me` · `GET /api/users/discover` · `POST /api/users/swipe`
- `POST /api/matches` · `GET /api/matches?mine=true&sport=` · `GET /api/matches/:id` · `POST /api/matches/:id/join` · `/leave`
- `POST /api/teams` · `GET /api/teams?mine=true` · `GET /api/teams/:id` · `POST /api/teams/:id/regenerate-invite` · `POST /api/teams/join/:code`
- `GET /api/matches/:id/messages` · `POST /api/matches/:id/messages` · `WS /api/ws/chat/:match_id?token=...`

## Business Hook
"It's a Match!" toast on mutual right-swipes — a familiar viral mechanic that drives DAU and turns players into chat-active match attendees.
