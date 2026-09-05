# DoSJE Admin Dashboard (Member 6)

Admin Web Dashboard for SIH 2026, Problem Statement 26095 — Smart Real-Time
Monitoring & Inspection Mobile App. This is Member 6's component: the
government control-center UI that will consume APIs built by Member 2.

## Stack
React 19 + TypeScript + Vite, Tailwind CSS, React Router, Recharts, React-Leaflet, Lucide icons.

## Getting started
```bash
npm install
npm run dev
```
Sign in with any email/password — auth is mocked until Member 2's backend is connected.

## Connecting Member 2's real backend
1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL` to the backend's base URL.
3. Set `VITE_USE_MOCK_DATA=false`.
4. Every function in `src/services/api.ts` already has a `request()` branch pointed at a
   documented REST endpoint (e.g. `/projects`, `/inspections`, `/alerts`) — confirm the
   path and response shape match Member 2's actual API and adjust as needed.
5. No page or component needs to change — they only ever call `src/services/api.ts`.

## Project structure
```
src/
  types/index.ts         Domain types — the contract with the backend
  lib/mockData.ts         Deterministic mock data (only imported by services/api.ts)
  services/api.ts         API layer — the ONE place fetch() is called
  context/AuthContext.tsx JWT-style session state
  components/layout/      Sidebar, Header, DashboardLayout, ProtectedRoute
  components/ui/          Badges, StatCard, Panel, loading/empty/error states
  hooks/useAsyncData.ts   Shared data-fetching hook
  pages/                   One file per dashboard section (see below)
```

## Pages implemented
Login · Dashboard (overview) · Projects · Institutes · Inspections · Live Map ·
CCTV · Alerts · Reports · Analytics · Users · Audit Logs

## Notes
- AI risk indicators are always labeled as decision support, never as confirmed findings,
  per the SIH problem statement's requirement.
- The CCTV page is a clean integration point (camera roster + status), not a fake video
  backend — the actual stream comes from Member 3.
- Map uses OpenStreetMap tiles via Leaflet; institute coordinates are mock/demo until
  Member 2 supplies real geo data.
