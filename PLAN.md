# REZ Homes: Listings Platform Plan (draft)
Scope: property **listings and advertising only**. There is no investment product and no investment language (REZ investment activity stays blocked pending SEC counsel).

## Phase 0: Static draft (this folder)
- Plain HTML/CSS/JS, no build step, mobile-first. Brand colours: white, green #0b6b3a, gold #d4a017.
- Sample listings are hard-coded in app.js and labelled SAMPLE. The WhatsApp number is a placeholder.

## Cheap hosting path
1. **Free option:** Cloudflare Pages or GitHub Pages (static, free SSL).
2. **Shadrick's Hostinger VPS:** install Nginx and copy `site/` to `/var/www/rezhomes`, then add a server block and run `certbot --nginx` for free SSL. Cost: the existing VPS plus a domain (.co.zm via ZICTA registrars, or .com at about $10-15 a year).
3. Point DNS (A record) to the VPS IP. Nothing is deployed until Shadrick approves.

## Backend later: Supabase
- Tables: `landlords` (id, name, phone, whatsapp, tier, verified, created_at), `listings` (id, landlord_id, city, type, price_zmw, beds, description, photos[], status, featured), `enquiries` (listing_id, name, phone, msg, created_at), `subscriptions` (landlord_id, tier, paid_until, momo_ref).
- Supabase Auth with phone OTP for landlords, Storage for photos, and RLS so landlords can only edit their own listings. Listings are publicly readable when status = 'active'.
- The front end calls the Supabase JS client instead of the hard-coded array. It can stay static-hosted.
- Payments: MTN and Airtel mobile money, confirmed manually at first (as in VE). Automate later via n8n or an aggregator.

## Landlord onboarding flow
1. Landlord taps "List your property", which opens WhatsApp with a prefilled message, or fills in a sign-up form.
2. REZ collects name, NRC/ID, phone, property location, photos, rent and type.
3. Verification: check ownership or authority to let (title deed, lease, or caretaker letter). A site visit or video call earns the Verified badge.
4. Landlord picks a tier and pays by mobile money. REZ records the reference and activates the listing.
5. Listing goes live, and enquiries go straight to the landlord's WhatsApp.
6. Monthly renewal reminder is sent. If unpaid, the listing is hidden (not deleted).

## Tenant flow
Search by city, type and price, open a listing, then tap "Enquire on WhatsApp" (prefilled message).

## Proposed pricing (proposal only)
PROPOSED (v3): Starter K200/month (1 listing), Landlord K350 (5 listings), Pro K1,000 (unlimited plus featured placement). Boost K100/week or K300/month. One-time verification K250 per property. No fees are charged until the lawyer answers the Estate Agents Act question (`PAYMENTS_ENABLED=false`).

PROPOSED (v4): verification K500 per property per year; boost K100/week × 1–12 weeks (5 weeks recommended); field agent commission K150 per approved inspection.

## Field agents (v4)
Existing estate agents become REZ field agents rather than competitors. They inspect nearby properties in their free time, file a checklist report with photos, and earn a commission once staff approve it. Needs: a lawyer-reviewed agent agreement and the Estate Agents Act answer.

## Open items / risks
- Get counsel to confirm whether Estate Agents Act registration applies (see sec_research_brief.md Q7).
- Data Protection Act 2021: add a privacy notice before collecting real data.
- Fraud and scam listings: verification process and a report button.
- Need Shadrick to supply the real WhatsApp number, domain choice and logo.
