# Manual Testing Guide

Step-by-step scenarios for manually verifying the core user flows work end to end, on top of the automated suite (see README's ["Testing strategy & rationale"](README.md#testing-strategy--rationale) for what's covered automatically). Useful for a reviewer — or anyone else — checking the app behaves correctly without reading the code or the tests.

Each scenario lists **Steps** and **Expected result**. A checkbox next to each is there so you can tick them off as you go.

## Before you start

1. Follow README's ["Getting started"](README.md#getting-started) to get the app running at `http://localhost:3000` with the seed data applied.
2. You'll be using the [seeded test admin credentials](README.md#test-admin-credentials): `admin@example.com` / `admin12345`.
3. The seed data gives you three products to work with:
   - **Wireless Mouse M1** — published (`/products/wireless-mouse`)
   - **Mechanical Keyboard K2** — draft (no public URL — see Scenario 8)
   - **USB-C Hub 7-in-1** — published (`/products/usb-c-hub`)

If you restart from a clean database partway through, re-run `npm run seed` to get back to this exact starting state.

---

## Part 1 — Admin panel (core)

### 1. Auth gating on direct navigation

- [ ] **Steps:** With no active session (use a private/incognito window, or clear cookies first), navigate directly to `http://localhost:3000/admin/products`.
- [ ] **Expected result:** Redirected to `/admin/login` — the product list is never shown without a valid session.

### 2. Login — wrong password

- [ ] **Steps:** Go to `/admin/login`. Enter `admin@example.com` with an incorrect password (e.g. `wrongpassword`) and submit.
- [ ] **Expected result:** A visible error message appears (red-bordered banner). The email/password you typed are **not** cleared. You remain on the login page.

### 3. Login — success

- [ ] **Steps:** On `/admin/login`, enter the real credentials (`admin@example.com` / `admin12345`) and submit.
- [ ] **Expected result:** Redirected to `/admin/products`, showing the product list.

### 4. Already-authenticated visit to the login page

- [ ] **Steps:** While still logged in from Scenario 3, navigate directly to `/admin/login` again.
- [ ] **Expected result:** Redirected straight back to `/admin/products` — an authenticated session never sees the login form again until it logs out.

### 5. Product list — content and navigation

- [ ] **Steps:** On `/admin/products`, look at the list.
- [ ] **Expected result:** All three seeded products are listed, each showing its **name** and **status** badge (Published/Draft). Clicking a row opens that product's editor.

### 6. Editor — read-only fields

- [ ] **Steps:** Open the editor for **Wireless Mouse M1**.
- [ ] **Expected result:** The name and characteristics (Colour, Connection, Battery life) are visible but **not editable** — there's no input for them, only for description/SEO fields and status.

### 7. Editor — client-side validation

- [ ] **Steps:** In the same editor, clear the **Description** field entirely. Then, in a fresh attempt, type into **SEO title** until the character counter goes past 60 and turns red (e.g. paste a long sentence).
- [ ] **Expected result:** In both cases, the **Save** button becomes disabled while the field is invalid (empty required field, or over the character limit — description ≤1000, SEO title ≤60, SEO description ≤160). Re-entering valid content re-enables Save.

### 8. Editor — save persists correctly

- [ ] **Steps:** Restore **Wireless Mouse M1**'s description to something valid, e.g. append " (edited)" to the end. Click **Save**. Wait for the "Saved" confirmation, then reload the page (`F5`).
- [ ] **Expected result:** Save shows a clear success state ("Saving…" then "Saved"). After reloading, the edited description is still there — the change persisted to the database, not just the in-memory form state.

### 9. Editor — failed save doesn't lose your edits

- [ ] **Steps:** With the app still running, stop the Postgres container (`docker compose stop postgres`) to simulate a backend failure. In the editor, change the description to something new and click **Save**.
- [ ] **Expected result:** Save fails with a visible error message. The text you typed is **still in the field** — it is not cleared, and the failure is not shown as if it succeeded. Restart Postgres afterward (`docker compose start postgres`) before continuing.

### 10. Editor — publish/unpublish controls public visibility

- [ ] **Steps:** Open **Mechanical Keyboard K2** (currently Draft). Change its status to **Published** and save. Open a new tab to the public catalog (`/`) and confirm it now appears there. Then go back to the editor, switch it back to **Draft**, save, and refresh the catalog tab again.
- [ ] **Expected result:** The product appears in the public catalog only while `Published`, and disappears again once switched back to `Draft` — status directly controls public visibility. (This restores the seed's original state, so leave it as `Draft` when done.)

### 11. Logout

- [ ] **Steps:** Click **Log out** from the admin header.
- [ ] **Expected result:** Redirected to `/admin/login`. Attempting to navigate back to `/admin/products` redirects to login again (session is actually gone, not just hidden by the UI).

### 12. Invalid data rejected even via direct API calls

- [ ] **Steps:** While logged out, try to bypass the UI entirely with a direct API request:
  ```bash
  curl -i -X PATCH http://localhost:3000/api/admin/products/<any-product-id> \
    -H "Content-Type: application/json" \
    -d '{"description":"","seoTitle":"x","seoDescription":"x","status":"PUBLISHED"}'
  ```
- [ ] **Expected result:** `401 Unauthorized` (no session cookie sent) — admin operations aren't reachable at all without authentication, regardless of what the request body contains.

---

## Part 2 — Public site (core)

### 13. Catalog shows only published products

- [ ] **Steps:** Visit `/` (the public catalog) as a logged-out visitor.
- [ ] **Expected result:** **Wireless Mouse M1** and **USB-C Hub 7-in-1** are listed. **Mechanical Keyboard K2** (draft) is **not** shown anywhere.

### 14. Product page content and SEO

- [ ] **Steps:** Click through to **USB-C Hub 7-in-1**'s product page (`/products/usb-c-hub`). Check the browser tab title, and view the page source (or "View Page Source") for the meta description tag.
- [ ] **Expected result:** The page shows the product's name, characteristics (Ports, Max resolution), and description. The browser tab title matches the product's **SEO title**, and the `<meta name="description">` tag matches its **SEO description**.

### 15. Draft product is unreachable, both by page and by API

- [ ] **Steps:** Navigate directly to `/products/mechanical-keyboard` (the draft's slug). Separately, call the public API directly:
  ```bash
  curl -i http://localhost:3000/api/products/mechanical-keyboard
  ```
- [ ] **Expected result:** The page shows a genuine **404 Not Found** (check dev tools' Network tab, or `curl -I` on the page URL, for the actual HTTP status — not just a "not found"-looking page rendered with a 200). The API call also returns `404`.

---

## Part 3 — Bonus features (optional, if enabled)

These require extra setup per README — skip any you haven't configured.

### 16. AI content suggestions (mock mode — no API key needed)

- [ ] **Steps:** With `OPENAI_API_KEY` unset (the default), open any product's editor and click **Suggest with AI**.
- [ ] **Expected result:** A preview appears, clearly labeled **"Simulated (no API key set)"**, with a generated description and SEO fields in Ukrainian based on the product's name/characteristics. Click **Apply to editor** — the fields update in the form, but **nothing is saved yet** (reload the page without saving first, and the original content is still there). Try **Discard** on a fresh suggestion instead — the editor's fields are untouched.

### 17. Shopify import (needs `SHOPIFY_STORE_DOMAIN` + credentials configured)

- [ ] **Steps:** On the admin product list, use the **Import from Shopify** form with a real product ID from your configured store.
- [ ] **Expected result:** A new product appears in the list as a **Draft**, with its content mapped from the Shopify product (description, vendor/type/options as characteristics). Opening it in the editor shows the imported content, editable like any other product.

### 18. Full stack via Docker Compose

- [ ] **Steps:** Stop any locally-running `npm run dev`, then run `docker compose up --build` (see README's ["Running the whole app via Docker Compose"](README.md#running-the-whole-app-via-docker-compose)).
- [ ] **Expected result:** Once the one-off `migrate` service finishes, the app is reachable at `http://localhost:3000` — same behavior as Scenarios 1–15, but running entirely in containers, no local Node install needed.

---

## If something fails

The automated test suite (`npm test` + `npm run test:e2e`, [152 tests total](README.md#testing-strategy--rationale)) covers all of the scenarios above plus many more edge cases. If a manual check here doesn't match its expected result, that's worth investigating — running the matching automated test first is usually the fastest way to narrow down whether it's a real regression or a one-off local environment issue (stale seed data, a leftover cookie, etc.).
