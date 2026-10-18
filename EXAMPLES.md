# Owner-review property examples

Open `/?examples=1` to see fictional review fixtures. Opening the preview normally remains unchanged: no seeded live inventory. Existing browser-local user listings are not replaced, persisted into, cleared or reset.

Coverage uses the app's existing city list without adding or renaming any city:
- Lusaka — Chalala rental house.
- Ndola — Northrise rental flat.
- Kitwe — student rental room.
- Kabwe — rental shop.
- Livingstone — Dambwa rental house.
- Chingola — rental house.
- Kasama — rental family house.

A separate section contains three additional for-sale examples (Lusaka and Kitwe). Sale cards/details show an illustrative asking price, never a monthly rental price. City/type/rent filters apply to the rental collection; the separate for-sale collection is illustrative and not an exhaustive city inventory.

All ten examples use existing licensed stock photos (see img/CREDITS.md), imaginary prices/features and approximate area coordinates. None is a real listing, valuation, inspection, title/ownership or availability claim. Cards and details carry example labels. No application, enquiry or payment is accepted for these sample IDs. Example detail pages do not offer actual viewing directions. Nothing is submitted to a landlord, inspector, payment provider or real property backend.

Sample mode exists only on the current review URL; it does not enable a production sales/listing workflow. It preserves the newer preview photo carousels, mobile layout, inspector changes and default inventory behavior rather than copying an older source tree over them.

Checks:
- `node --test examples.test.cjs`: exact city coverage/IDs, photos present, opt-in/default behavior, saved-listing preservation, rental/sale separation and rejected sample applications/enquiries/payments.
- `node --check app.js`, `node --check data.js`, `node --check examples.js`.
- Actual Chromium desktop/mobile checks: seven rental city filters, three sale cards, details/reload, asking-price labels, no sample application/enquiry controls, images and no horizontal overflow/page errors. Published URL must be checked again after the exact Pages deployment completes.
