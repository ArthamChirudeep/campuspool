# CampusPool @ CVR — build plan

A campus carpooling platform for CVR College of Engineering, Mangalpally (Hyderabad), with smart matching, live maps, ride chat, and sustainability dashboards.

## Screens

- **Home (public)** — what CampusPool is, how it works, sign-in call to action, live counters (rides today, CO2 saved). Clear "CampusPool @ CVR — a student project, not officially endorsed by CVR College" note.
- **Sign in / Sign up** — email + password, plus Google sign-in. Student profile: name, photo, phone, department, year, home area, vehicle details for drivers.
- **Dashboard** — my upcoming rides, requests awaiting my answer, quick actions, personal impact snapshot.
- **Offer a ride** (multi-step) — route (from/to with map picker and pickup points) → schedule (one-time date/time, or recurring days like Mon–Fri) → seats, fare share, notes → review and publish.
- **Find a ride** — search by destination, time and day; results ranked by the Smart Match Engine with a match score and reasons ("2 min detour", "leaves 5 min after you", "same route 92%"). Map preview per ride.
- **Ride detail** — map with route line and pickup points, driver profile, seat availability, request-to-join button, passenger list.
- **My rides** — driver view (accept/decline requests, start, complete, cancel) and passenger view (pending, confirmed, history).
- **Ride chat** — live message thread per ride for driver and confirmed passengers.
- **Impact** — personal savings (km shared, fuel, money, CO2) and a campus-wide SDG 11 board with charts and milestones.
- **Demo mode** — a guided walkthrough panel for judges with realistic seeded rides plus a protected "Reset demo data" action.
- **Admin settings** — configure campus name, address, coordinates, endorsement wording, demo controls. Admin-only.

## Maps

Google Maps (Lovable-managed) draws routes, pickup points and live previews. If maps can't load for any reason, every map falls back to a clean schematic route strip showing origin → pickup stops → campus with distance and time, so nothing ever breaks during the demo.

## Smart Match Engine

Deterministic scoring, no randomness — same inputs always give the same ranking:
- Route overlap between rider's origin and the driver's path corridor
- Detour cost in extra km/minutes for the driver
- Departure time gap against the rider's preferred window
- Recurring day overlap
- Seat availability and a small preference/rating factor
Each result shows its score and human-readable reasons.

## Seed data

Realistic student commutes from Ibrahimpatnam, LB Nagar, Vanasthalipuram, Hayathnagar, Nagole, Uppal, Dilsukhnagar, Kothapet, Saroornagar and Karmanghat into CVR, with overlapping corridors so matches look strong. Includes student profiles, one-time and recurring rides, pickup points, pending and accepted requests, and sample chat. Shared demo data is visible to all; "Reset demo data" regenerates it and never touches real user accounts or their rides.

## Data and backend (technical)

Lovable Cloud, tables: `profiles`, `user_roles` (separate table, admin/student), `campus_settings`, `locations`, `rides`, `ride_stops`, `ride_schedules`, `ride_requests`, `messages`, `impact_events`, plus an `is_demo` flag on demo-owned rows. Row-level security everywhere: users read/write their own rows, ride participants read ride chat, demo rows readable by all signed-in users, admin-only writes on settings and demo reset. Matching runs in a server function so scoring is server-authoritative; Google Maps directions are called server-side through the connector with results cached per route to control cost. Chat uses realtime subscriptions. Seed and reset ship as SQL in migrations plus an admin-guarded reset function.

## Build order

1. Cloud + Google Maps connection, schema, RLS, seed migration
2. Auth, profiles, app shell and navigation
3. Offer ride flow, find/match, ride detail with maps + fallback
4. Requests lifecycle, my rides, realtime chat
5. Impact dashboards, demo mode, admin settings, SEO metadata
