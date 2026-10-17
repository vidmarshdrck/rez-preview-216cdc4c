# REZ Homes — private preview
Unlisted GitHub Pages preview. . Not production.

# REZ Homes (static prototype)
Property listings and advertising for Zambia. No investment product.

## Newcomer commands
```bash
# Open the site locally (no build step)
python3 -m http.server 8080
# then visit http://localhost:8080/

# Or open the file directly
open index.html   # macOS; on Linux use xdg-open

# Run the existing browser checks (from the sibling rez/ folder when present)
# node ../test/v4.js
```


- Plain HTML/CSS/JS, hosted on GitHub Pages. Open `index.html` to run it.
- **Data:** all data (accounts, listings, applications, saved trips, agents, tasks, notifications) lives in the browser's localStorage via `data.js` (`DB.*`). It's per-device and demo-only. To go live, re-implement `data.js` with the Supabase client (Auth, `listings`, `applications` and Storage for photos). The UI only talks to `DB`, so it doesn't need to change.
- **Google sign-in** is a mock (demo). Real Google OAuth will come with Supabase Auth.
- Listings marked SAMPLE are not real properties. Prices marked PROPOSED are not final.
- Maps: Leaflet + OpenStreetMap (vendored in `vendor/`). Directions open Google Maps.
- Photos: Unsplash (Unsplash License), see `img/CREDITS.md`.

## v3 (October 2026)
- `config.js`: `PAYMENTS_ENABLED=false`, `WHATSAPP_NUMBER` (placeholder), verification fee (K250, PROPOSED), plans (Starter K200 / Landlord K350 / Pro K1,000), boost (K100/week, K300/month). All prices are PROPOSED.
- Verification: Draft → Awaiting verification payment → Inspection scheduled → Verified / Rejected. Only Verified listings show the badge.
- Lifecycle: active, occupied (hidden, stays verified), expired (plan unpaid), reactivate (no re-inspection unless staff flagged it), tenant leaving soon (relist early).
- Landlord portal: plan, views/enquiries/applications, days listed, fee due, upgrade path, property care tips.
- Staff portal (`#/admin`, demo staff mode only): verification queue, all listings, payments, overdue, occupied follow-up.
- Payment buttons (MTN, Airtel, Card, Binance Pay) only show a "launching soon, contact REZ on WhatsApp" sheet with a reference. Nothing is charged.
- Types include Flat and Shop / Store; 3D / Street View + satellite links; "Recommended for you" and "Similar homes".
- Backend plan: `../supabase/` (additions to Solomon's group schema). Launch: `../launch_checklist.md`. Tests: `../test/v3.js`.

## v4 (17 October 2026)
- Verification **K500 per property per year** (PROPOSED). The badge lasts 365 days, then "Re-verification due": the badge comes off, the listing stays up, and the landlord can renew (K500), which creates a 'renewal' inspection task.
- **Boost weeks selector**: 1–12 weeks × K100 with a live total. "★ 1-month boost (5 weeks)" is the default and recommended option (a month is about 4.3 weeks). Bundle examples: Starter K200 + 5-week boost K500 = K700, Landlord K350 + 5-week boost K500 = K850. Shown on the home pricing section and in the landlord's Boost sheet.
- **Field agents** (`#/agent`): existing estate agents sign up (name, phone, NRC/ID placeholder, base town, areas, availability, agent agreement placeholder tick). They see a task feed of properties needing inspection, nearest first (from their base town or "Use my location"), accept a task with a visit date, submit a report (5-item checklist, recommendation, notes, photos), and earn a commission (PROPOSED K150) per approved report. Earnings show pending/paid (**mock**). Staff (`#/admin`) approve agents, offer tasks to an agent (dropdown sorted by distance), review reports (approve → Verified/Rejected, or send back with a note) and record mock payouts.
- **Tenant profile + application**: occupation (Student / Employed / Self-employed / Not working / Other), school or employer (optional), from town, Single / Couple / Family with adults and children, and "Have you already seen this property?". The landlord sees a clean applicant card.
- **Acceptance notifications**: not seen → "Your application was accepted. The landlord invites you to view the property" with the landlord's proposed date and time. Seen → "Accepted. First come, first served: confirm and pay to secure it" (pay button is a placeholder). In-app inbox (`#/inbox`, 🔔 badge). Email / SMS / WhatsApp versions live in `templates.js` and are previews only ("Delivery via email/SMS/WhatsApp at launch"). The landlord gets a WhatsApp click-to-chat link prefilled with the message.
- Browsing and Google Maps directions stay free with no account.
- `config.js`: `VERIFICATION_FEE: 500`, `VERIFICATION_PERIOD_DAYS: 365`, `BOOST {week:100, maxWeeks:12, recommendedWeeks:5}`, `AGENT_COMMISSION: 150`, `AGENT_AGREEMENT_VERSION`, `DELIVERY_ENABLED: false`, `PAYMENTS_ENABLED: false`.
- Tests: `../test/v4.js` (130 headless-Chrome checks covering the v3 and v4 flows). Backend: `../supabase/schema.sql` section H.

## v5 (17 October 2026) — mobile listings-first
- Mobile (≤759px): compact hero, sticky-free search, listings lead; tall carousel kept for desktop only.
- Floating WhatsApp button hidden on mobile (Contact CTA remains); kept on desktop.
- Touch targets ≥44px; landlord listing actions stack full-width.
- Muted/green tokens darkened for WCAG AA contrast.
- Footer stays "Powered by VIDMΛR" (never "Vidmar Holdings").

