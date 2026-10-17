// REZ Homes configuration. Swap values here; nothing else needs to change.
// Every price below is a PROPOSAL, not final.
window.REZ_CONFIG = {
  PAYMENTS_ENABLED: false,              // false = payment buttons only show a "launching soon" sheet. No money is processed.
  WHATSAPP_NUMBER: "260000000000",      // PLACEHOLDER. International format, digits only (e.g. 26097XXXXXXX).
  WHATSAPP_DISPLAY: "+260 XXX XXX XXX", // PLACEHOLDER shown to users
  VERIFICATION_FEE: 500,                // PROPOSED annual fee (K) per property: an inspection now, re-verification every year
  VERIFICATION_PERIOD_DAYS: 365,        // the Verified badge lasts this long, then the property needs re-verification (another fee)
  VERIFICATION_FEE_SCOPE: "property",   // "property" = every property pays; "landlord" = only a landlord's first listing pays
  LISTING_PERIOD_DAYS: 30,              // one paid month of advertising
  OCCUPIED_FOLLOWUP_DAYS: 90,           // staff check in with landlords of occupied listings after this many days
  PLANS: [                              // PROPOSED monthly subscriptions (per landlord)
    { id: "starter",  name: "Starter",  price: 200,  listings: 1, tier: 0, tag: "Start here", perks: ["1 active listing", "5 photos", "WhatsApp enquiries", "Views & enquiry stats"] },
    { id: "landlord", name: "Landlord", price: 350,  listings: 5, tier: 1, perks: ["Up to 5 active listings", "15 photos each", "Views & enquiry stats", "Priority inspection booking"], popular: true },
    { id: "pro",      name: "Pro",      price: 1000, listings: 9999, tier: 2, perks: ["Unlimited listings", "Featured on homepage", "Social media promotion", "Monthly performance report"] }
  ],
  BOOST: { week: 100, minWeeks: 1, maxWeeks: 12, recommendedWeeks: 5 }, // PROPOSED featured-listing ads (K per week). 5 weeks covers a paid month (a month is about 4.3 weeks)
  AGENT_COMMISSION: 150,                // PROPOSED commission (K) paid to a REZ field agent per approved inspection, out of the verification fee
  AGENT_AGREEMENT_VERSION: "DRAFT-0 (placeholder, lawyer review pending)",
  DELIVERY_ENABLED: false,              // false = email/SMS/WhatsApp notifications are previews only; nothing is sent
  PAY_METHODS: [
    { id: "mtn",     name: "MTN Mobile Money", icon: "📱", color: "#FFCB05" },
    { id: "airtel",  name: "Airtel Money",     icon: "📲", color: "#E40000" },
    { id: "card",    name: "Visa / Card",      icon: "💳", color: "#1A1F71" },
    { id: "binance", name: "Binance Pay",      icon: "₿",  color: "#F0B90B" }
  ]
};
