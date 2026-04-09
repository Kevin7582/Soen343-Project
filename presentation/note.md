# Presentation notes — Nico

**Sections (rubric):** (5) Mockups of the main features · (6) Particularities of your solution compared to what already exists  

**Goal:** Use visuals to support the message; connect what is on screen to *design intent* and *differentiation*, not only “here is a button.”

---

## Timing (suggested)

| Block | ~Time | Focus |
|--------|--------|--------|
| Mockups / live UI walk-through | 3–4 min | One coherent story: citizen journey + one other role if time |
| Particularities vs market | 2–3 min | 3–4 clear contrasts, tied to SUMMS |

**Total target:** ~5–7 minutes (adjust to your team’s slot).

---

## Part 1 — Mockups of the main features

### Message in one sentence

> SUMMS gives **role-specific dashboards** and **unified map-based views** so citizens can move between shared mobility, parking, and transit without leaving one mental model.

### Visuals to show (pick slides or screen recording)

Use **either** static mockups from design phase **or** the running app (both count as “visuals”). If live demo fails, have **screenshots** as backup.

| # | What to show | Where in the app / repo | What to say (prompts) |
|---|----------------|-------------------------|------------------------|
| 1 | **Auth & roles** | Login/register; Citizen vs Provider vs Admin | “Access is scoped by role; the UI factory drives which tabs appear.” (`App.jsx`, `roleDashboardFactory`) |
| 2 | **Citizen dashboard (home)** | Dashboard tab: stats, STM alert if any, map, quick actions | “Single entry point: availability snapshot + deep links into mobility, transit, parking, analytics.” |
| 3 | **Mobility** | BIXI vs scooters/bikes toggle; map + list; reserve flow | “Same map shell; we swap data layers (stations vs fleet).” (`VehicleMap.jsx`, `mobilityService`) |
| 4 | **Rental lifecycle** | Reserve → payment modal → active rental → return | “Guided steps: search → reserve → ride → done.” (`RentalStepIndicator`, `PaymentGate`) |
| 5 | **Parking** | Map + spot cards; reserve / start / complete | “Parking is first-class, not an afterthought.” (`ParkingMap.jsx`) |
| 6 | **Transit** | STM status page + (if demo allows) transit map with directions | “Regional integration: metro status plus trip planning on the map.” (`TransitMap.jsx`, proxy in `docs/TRANSIT_SETUP.md`) |
| 7 | **Provider / Admin** (optional 1 slide) | Fleet / rentals; admin analytics | “Operators and admins see different aggregates than citizens.” |

### Structure tip (content & flow)

1. **Set context:** “These screens implement the GUIs we specified for the to-be system.”  
2. **Walk one path:** e.g. Dashboard → Mobility → reserve → Active Rental.  
3. **Call out design consistency:** dark theme, cards, shared `MapShell` (see `README.md` “Map Architecture”).  
4. **Handoff:** “Yifu will show this live in the demo” or “Next, [teammate] covers …”

### Checklist before presenting

- [ ] Screenshots or slide deck exported (PDF) if not using live app  
- [ ] `.env` / keys OK if using live Transit & Maps  
- [ ] One “happy path” account ready (Citizen)  
- [ ] Zoom browser to ~125% if projecting so text is readable  

---

## Part 2 — Particularities compared to what already exists

### Message in one sentence

> SUMMS is not just another rental or maps app; it **aggregates** shared mobility, parking, transit, and light analytics behind **one layered architecture** and **role-based** experiences.

### Comparators (keep it fair)

Name **categories**, not a single competitor lawsuit-style:

- Standalone **micromobility** apps (one fleet, one mode)  
- **Parking** apps (often parking-only)  
- **Transit** apps (often schedule/status-only; trip planning varies)  
- **MaaS** platforms in cities that exist but are often locked to one region or one operator contract  

### Differentiators to mention (map to your implementation)

| Particularity | Why it matters | Ground in project |
|---------------|----------------|-------------------|
| **Unified hub** | One product surface for multiple mobility problems | Citizen tabs: dashboard, mobility, parking, transit, analytics (`App.jsx`) |
| **Role-based GUIs** | Same platform, different responsibilities | Citizen / Provider / Admin flows and tabs |
| **Shared map foundation** | Less duplication; consistent UX; easier to extend | `MapShell.jsx`, `mapUtils.js`, `mapRoutingService.js` (`README.md`, `ARCHITECTURE.md`) |
| **Layered design linked to code** | Presentation ↔ service ↔ data boundaries match course design activities | `src/layers/presentation`, `service-layer`, `data-layer`, `api-gateway` |
| **Live + mock resilience** | Demonstrates real integration without hiding failure modes | Supabase + fallbacks in services (e.g. `recommendationService`, `mockData`) |
| **Regional / data integrations** | Not generic placeholders only | BIXI data, STM-style metro status, Google Directions/Places (as configured) |
| **Recommendations tied to profile** | Personalization beyond “nearest vehicle” | Profile preferences + `RecommendationService` + dashboard banner |

### Phrases to avoid / to prefer

- Avoid: “We built the best app.”  
- Prefer: “We **targeted** integration and role separation because the as-is system was fragmented; our GUI and layers **reflect** that decision.”

### Optional one-slide “vs X” table

Two columns: **Typical single-purpose app** | **SUMMS**. Three rows: scope, users, technical approach (layered + gateway hook).

---

## Suggested closing line before handoff

> “The mockups and this UI realize the citizen and operator journeys we modeled; the demo will show them in motion.”

---

## Repo pointers (for Q&A)

- UI entry: `src/layers/presentation/ui/App.jsx`  
- Styles / visual system: `src/layers/presentation/ui/styles.css`  
- Architecture overview: `ARCHITECTURE.md`  
- Design diagrams: `docs/diagrams/`  

---

## Team slide order reminder (context only)

| Topic | Speaker |
|--------|---------|
| As-is → to-be overview | Adnane |
| New architecture & services | Kevin |
| Design patterns / strategies | Youssef |
| Design ↔ implementation | Peter |
| **Mockups & particularities** | **Nico** |
| Lessons learned & conclusion | TBD |
| Demo | Yifu |
