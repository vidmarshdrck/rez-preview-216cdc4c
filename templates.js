// REZ Homes message templates (v5). PREVIEW ONLY: nothing is sent from this site.
// At launch these go out by email / SMS / WhatsApp through a provider chosen by Shadrick
// (see ../launch_checklist.md). Until then REZ_CONFIG.DELIVERY_ENABLED = false.
// Placeholders: {{name}} is replaced from the data passed to REZ_TPL.render(key, channel, data).
// The same rows are seeded into rez.message_templates in ../supabase/schema.sql (keep both in sync).
window.REZ_TEMPLATES = {
  // Tenant hasn't seen the property: the landlord invites them to view it.
  application_accepted_viewing: {
    in_app: {
      title: "Application accepted: come and view",
      body: "Your application for {{listing_title}} ({{city}}) was accepted. {{landlord_name}} invites you to view the property on {{viewing_date}}.{{landlord_note_line}} Reply to confirm the time or suggest another."
    },
    email: {
      subject: "Accepted: view {{listing_title}} on {{viewing_date}}",
      body: "Hi {{tenant_name}},\n\nGood news: your application for {{listing_title}} in {{city}} was accepted.\n\n{{landlord_name}} invites you to view the property in person on {{viewing_date}}.{{landlord_note_line}}\n\nAddress: {{address}}\nDirections: {{directions_url}}\n\nPlease confirm the time, or suggest another, by replying on WhatsApp: {{landlord_wa_url}}\n\nRent {{rent}}/month · deposit {{deposit}} · {{upfront}} month(s) upfront.\n\nREZ Homes · Real Estate Zambia\n{{listing_url}}"
    },
    sms: {
      body: "REZ Homes: {{tenant_name}}, your application for {{listing_title}} was accepted. Viewing invite: {{viewing_date}}. Confirm with {{landlord_name}} on {{landlord_phone}}. {{listing_url}}"
    },
    whatsapp: {
      body: "Hi {{tenant_name}}, this is {{landlord_name}} via REZ Homes. Your application for *{{listing_title}}* ({{city}}) has been accepted. I'd like to invite you to view the property on *{{viewing_date}}*.{{landlord_note_line}} Directions: {{directions_url}}. Does that time work for you?"
    }
  },
  // Tenant has already seen it: first come, first served, confirm and pay to secure.
  application_accepted_pay: {
    in_app: {
      title: "Accepted: confirm and pay to secure it",
      body: "Your application for {{listing_title}} ({{city}}) was accepted. First come, first served: confirm and pay to secure it. Move-in cost {{move_in_total}} ({{upfront}} month(s) rent + deposit).{{landlord_note_line}}"
    },
    email: {
      subject: "Accepted: secure {{listing_title}} now (first come, first served)",
      body: "Hi {{tenant_name}},\n\nYour application for {{listing_title}} in {{city}} was accepted.\n\nYou told us you've already seen the property, so the landlord is ready for you to move in. It's first come, first served: confirm and pay to secure it before someone else does.\n\nMove-in cost: {{move_in_total}} ({{upfront}} month(s) rent at {{rent}} + {{deposit}} deposit).{{landlord_note_line}}\n\nConfirm with {{landlord_name}} on WhatsApp: {{landlord_wa_url}}\n\nREZ Homes · Real Estate Zambia\n{{listing_url}}"
    },
    sms: {
      body: "REZ Homes: {{tenant_name}}, you're accepted for {{listing_title}}. First come, first served: confirm & pay to secure it ({{move_in_total}}). Call {{landlord_name}} {{landlord_phone}}. {{listing_url}}"
    },
    whatsapp: {
      body: "Hi {{tenant_name}}, this is {{landlord_name}} via REZ Homes. Your application for *{{listing_title}}* ({{city}}) has been accepted. Since you've already seen it, it's first come, first served: please confirm and pay to secure it. Move-in cost {{move_in_total}}.{{landlord_note_line}}"
    }
  },
  application_declined: {
    in_app: { title: "Application update", body: "{{landlord_name}} has chosen another applicant for {{listing_title}}. Similar homes are waiting for you on REZ Homes." },
    email: { subject: "Update on {{listing_title}}", body: "Hi {{tenant_name}},\n\nThank you for applying for {{listing_title}}. The landlord has chosen another applicant this time.\n\nBrowse similar homes: {{site_url}}\n\nREZ Homes" },
    sms: { body: "REZ Homes: {{listing_title}} has gone to another applicant. See similar homes: {{site_url}}" },
    whatsapp: { body: "Hi {{tenant_name}}, thank you for applying for *{{listing_title}}* on REZ Homes. The landlord has chosen another applicant this time. Similar homes: {{site_url}}" }
  },
  // v5: REZ inspector application decisions.
  inspector_approved: {
    in_app: { title: "You're a REZ Certified Inspector", body: "REZ approved your inspector application. Certificate {{cert_no}}, valid until {{expires}}. You can now take inspection tasks near you." },
    email: { subject: "Approved: your REZ Certified Inspector certificate {{cert_no}}", body: "Hi {{agent_name}},\n\nREZ approved your inspector application. Your certificate number is {{cert_no}}, valid until {{expires}}.\n\nIt certifies you to carry out REZ listing inspections on the REZ Homes platform. It is not a professional licence.\n\nOpen your tasks: {{site_url}}#/agent\n\nREZ Homes" },
    sms: { body: "REZ Homes: {{agent_name}}, you're approved as a REZ Certified Inspector ({{cert_no}}, valid to {{expires}}). Open your REZ tasks to start." },
    whatsapp: { body: "Hi {{agent_name}}, REZ Homes approved your inspector application. Certificate *{{cert_no}}*, valid until {{expires}}. You can now take inspection tasks near you." }
  },
  inspector_application_rejected: {
    in_app: { title: "Inspector application: changes needed", body: "REZ couldn't approve your inspector application yet. Reason: {{reason}} Update your details or documents and apply again." },
    email: { subject: "Your REZ inspector application", body: "Hi {{agent_name}},\n\nThank you for applying to inspect properties for REZ. We couldn't approve your application yet.\n\nReason: {{reason}}\n\nUpdate your details or documents and apply again: {{site_url}}#/agent\n\nREZ Homes" },
    sms: { body: "REZ Homes: {{agent_name}}, your inspector application needs changes: {{reason}} Apply again in your REZ agent profile." },
    whatsapp: { body: "Hi {{agent_name}}, REZ Homes couldn't approve your inspector application yet. Reason: {{reason}} Please update it and apply again." }
  },
  // Field agent gets a task assigned by staff.
  agent_task_assigned: {
    in_app: { title: "New inspection task", body: "REZ assigned you an inspection: {{listing_title}}, {{address}} ({{distance}}). Commission {{commission}} (PROPOSED) once your report is approved." },
    sms: { body: "REZ Homes: new inspection task {{listing_title}}, {{address}}. Open your REZ agent tasks to accept." },
    whatsapp: { body: "Hi {{agent_name}}, REZ Homes has a new inspection task for you: *{{listing_title}}*, {{address}}. Open your agent tasks to accept it." },
    email: { subject: "New REZ inspection task: {{listing_title}}", body: "Hi {{agent_name}},\n\nREZ assigned you an inspection: {{listing_title}}, {{address}}.\nCommission {{commission}} (PROPOSED) once your report is approved.\n\nREZ Homes" }
  }
};
window.REZ_TPL = {
  CHANNELS: [["in_app","In-app"],["email","Email"],["sms","SMS"],["whatsapp","WhatsApp"]],
  render(key, channel, data) {
    const t = (window.REZ_TEMPLATES[key] || {})[channel]; if (!t) return null;
    const f = s => String(s || "").replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] != null ? String(data[k]) : "");
    return { title: f(t.title), subject: f(t.subject), body: f(t.body) };
  },
  // WhatsApp click-to-chat link prefilled with the message. Opens the sender's own WhatsApp; nothing is sent automatically.
  waLink(phone, text) {
    const d = String(phone || "").replace(/\D/g, "").replace(/^0/, "260");
    return "https://wa.me/" + d + "?text=" + encodeURIComponent(text);
  }
};
