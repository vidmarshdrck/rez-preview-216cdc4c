# Owner-review rental examples

REZ Homes is a rental-listing and advertising platform. Landlords post their properties and enter their own **monthly rent**, security deposit and upfront rental months. It is not a house-sales marketplace. The sample rents below are fictional review data, not REZ-set landlord prices or market valuations.

Open `/?examples=1` to see seven rental examples, one per existing city:
- Lusaka — Chalala rental house.
- Ndola — Northrise rental flat.
- Kitwe — student rental room.
- Kabwe — rental shop.
- Livingstone — Dambwa rental house.
- Chingola — rental house.
- Kasama — rental family house.

No cities were added or renamed. There are no for-sale examples, purchase prices or sale browsing controls. Cards display monthly rent; details show monthly rent, deposit and upfront rent. The landlord form still takes the landlord's own `rent` value unchanged.

Examples use existing licensed stock photos (see img/CREDITS.md), imaginary rents/features and approximate area coordinates. None is a real listing, inspection, ownership or availability claim. Cards and details carry example labels. No application, enquiry or payment is accepted for sample IDs, and sample details do not offer real viewing directions.

Example mode is opt-in. Normal browsing remains unchanged, with no seeded public inventory. Existing browser-local landlord listings are not replaced, cleared or reset. No production backend, account, payment or notification integration is enabled by these fixtures.

Checks:
- `node --test examples.test.cjs`: exact existing-city coverage, rental-only data/display, photo existence, saved-listing preservation, rejected sample transactions and roundtrip of a landlord-entered monthly rent.
- Syntax checks for app.js, data.js and examples.js.
- Actual Chromium desktop/mobile checks of all city filters, cards, rental details/reload, absent sales section, images and overflow, repeated on the published URL after deployment.
