# CraftVeda — Project Status

> **Date:** 2026-11-16 (Step 9 — final polish)
> **Scope:** Single merged status document (replaces `PROJECT_STATUS.md` + `project_status_new.md`).
> All statements below were verified against the current code and a full regression run on this date.

---

## 1. Project Structure

```
CraftVeda/
├── README.md                  ← root readme (setup, accounts, env, demo, tests)
├── PROJECT_STATUS.md          ← this file
├── DATABASE_SCHEMA.docx       ← schema document (update from the tables in README)
├── .gitignore
├── backend/
│   ├── server.js              ← dotenv → connectDB → app.listen
│   ├── seed.js                ← idempotent demo seed (npm run seed)
│   ├── .env / .env.example
│   ├── src/
│   │   ├── app.js             ← middleware + 15 route mounts + /api/health
│   │   ├── config/db.js
│   │   ├── middleware/        ← auth.js, errorHandler.js, validate.js
│   │   ├── models/            ← 12 models
│   │   ├── routes/            ← 15 route files
│   │   ├── controllers/       ← 6 controllers (cart, wishlist, review, workshop, artisan, adminStats)
│   │   ├── validators/        ← 6 express-validator rule sets
│   │   ├── scripts/seedAdmin.js
│   │   └── utils/             ← ApiError.js, catchAsync.js
│   └── tests/                 ← 4 E2E scripts (steps 4, 5, 6, 8)
└── frontend/
    ├── index.html, vite.config.js (port 3000, /api → :5000), postcss, .oxlintrc.json
    ├── public/favicon.svg
    └── src/
        ├── App.jsx            ← all routes + role guards
        ├── components/        ← layout (Header/Footer), ProtectedRoute, Toast,
        │                        admin/AdminShell, artisan/ArtisanShell, order, product, review
        ├── context/           ← AuthContext, CartContext
        ├── pages/             ← 27 page directories (37 jsx files)
        ├── services/          ← 15 axios service modules
        └── constants/, utils/format.js
```

**Counts:** 12 models · 15 route files · 6 controllers · 6 validator files · 27 frontend pages · 15 services.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, Vite 8, Tailwind CSS v4 (`@theme`, no config file), Axios, Chart.js + react-chartjs-2, Oxlint |
| Backend | Node.js (ESM), Express 4, Mongoose 8, jsonwebtoken, bcryptjs, express-validator, helmet, morgan, express-rate-limit, cors (origin restricted to `CLIENT_URL`), qrcode, razorpay, multer/cloudinary/nodemailer (installed, not wired) |
| Database | MongoDB (local, port 27017) |
| Dev proxy | Vite on `:3000` proxies `/api` → `http://localhost:5000` |

---

## 3. Backend

### Server / middleware stack
`helmet → cors(origin callback on CLIENT_URL, credentials) → express.json → morgan(dev) → rate limiter (/api/: 100000/15min in dev, 100/15min in production, GETs skipped in dev) → auth limiter (login/register: 20/15min) → 15 route mounts → /api/health → errorHandler → 404`

- **dotenv quirk:** `server.js` calls `dotenv.config()` after imports are hoisted, so every env read in `src/**` is deliberately lazy (inside functions/request handlers). Verified: `JWT_SECRET`, `MONGO_URI`, `RAZORPAY_*`, `CLIENT_URL`, `NODE_ENV` are all read lazily.
- **Auth:** JWT Bearer, 30-day expiry, env-only `JWT_SECRET` (no hardcoded fallback). Middleware: `protect`, `adminOnly`, `artisanOnly`, `allowRoles(...)`. Passwords hashed with bcrypt (12 rounds) in a pre-save hook; `comparePassword()` method.
- **Validation:** `express-validator` + shared `validate` middleware on auth, cart, wishlist, reviews, workshops, artisan applications, orders, products, admin time-series, certificates, GI-tag admin, artisan my-orders.
- **Errors:** `ApiError` + `catchAsync` everywhere; `errorHandler` maps CastError→404, duplicate key→400, ValidationError→400, else 500; stack only when `NODE_ENV=development`.

### API routes (all mounted under `/api`)

| Area | Method + path | Access | Notes |
|---|---|---|---|
| Health | GET `/health` | public | `{status:'ok'}` |
| Auth | POST `/auth/register`, POST `/auth/login` | public | validated, rate-limited |
| | GET `/auth/me`, PUT `/auth/profile`, PUT `/auth/password` | logged in | |
| Products | GET `/products` | public | pagination, search, category/craft/price filters, hides inactive |
| | GET `/products/:id`, GET `/artisans/:id/products` | public | |
| | GET `/products/admin` | admin | includes inactive |
| | GET `/products/mine` | artisan | own products incl. inactive, search filter |
| | POST/PUT `/products`, PATCH `/products/:id`, DELETE `/products/:id` | artisan | ownership enforced |
| Artisans | GET `/artisans`, GET `/artisans/:id` | public | |
| | GET `/artisans/me` | artisan | own profile |
| | POST `/artisans`, PUT `/artisans/:id` | artisan/admin | |
| | GET `/artisans/me/stats`, GET `/artisans/me/orders` | artisan | dashboard stats + scoped orders |
| Applications | POST `/artisan-applications` | customer | one per user (unique index) |
| | GET `/artisan-applications`, PUT `/:id/approve`, PUT `/:id/reject` | admin | approve creates Artisan + upgrades role |
| | GET `/artisan-applications/my-application` | customer | |
| Workshops | GET `/workshops` | public | filters, `seatsLeft`, hides inactive |
| | GET `/workshops/:id` | public | |
| | POST `/workshops/:id/book` | logged in | capacity + one-booking-per-user checks |
| | GET `/workshops/my-bookings`, DELETE `/workshops/bookings/:id` | logged in | cancel restores seats |
| | GET `/workshops/mine`, POST `/workshops/mine`, PUT/DELETE `/workshops/mine/:id`, GET `/workshops/mine/:id/bookings` | artisan | full CRUD + booking list |
| | GET `/workshops/admin`, PATCH `/workshops/:id` | admin | |
| Orders | POST `/orders` | shopper | server-side pricing, atomic stock decrement w/ rollback |
| | GET `/orders`, GET `/orders/:id`, PUT `/orders/:id/cancel` | owner | cancel restores stock |
| Cart | GET/POST `/cart`, PUT/DELETE `/cart/:productId`, DELETE `/cart` | shopper | server-side cart |
| Wishlist | GET `/wishlist`, POST/DELETE `/wishlist/:productId`, POST `/wishlist/:productId/move-to-cart` | shopper | |
| Payments | POST `/payments/create-order`, POST `/payments/verify` | logged in | Razorpay (order + donation refs), HMAC verify; 500 if keys unset |
| Reviews | GET `/reviews/product/:productId`, GET `/reviews/artisan/:artisanId` | public | approved only + averages |
| | GET `/reviews/product/:productId/can-review` | logged in | delivered-purchase rule |
| | POST `/reviews` | logged in | verified purchase, one per user/product (partial unique index) |
| | PUT `/reviews/:id/helpful` | logged in | one vote per user (`$addToSet`) |
| | GET `/reviews`, PATCH `/reviews/:id` | admin | list + moderation (recalculates aggregates) |
| Donations | GET `/donations` | public | completed only + total |
| | POST `/donations` | logged in | created `pending` |
| | GET `/donations/all` | admin | all statuses + totals by status |
| Certificates | GET `/certificates/:certificateNumber`, GET `/certificates/verify/:number` | public | |
| | POST `/certificates/generate` | logged in | QR code, delivered orders only |
| GI tags | GET `/gi-tags`, GET `/gi-tags/:id` | public | |
| | GET `/gi-tags/admin`, PATCH `/gi-tags/:id` | admin | |
| Stories | GET `/craft-stories`, GET `/craft-stories/:slug` | public | |
| | POST `/craft-stories`, PUT/DELETE `/craft-stories/:id` | admin | slug CRUD |
| Admin | GET `/admin/stats` | admin | KPIs, recent orders, top products, pending applications |
| | GET `/admin/stats/timeseries?months=` | admin | zero-filled monthly series, revenue excl. cancelled |
| | GET/PUT/DELETE `/admin/users[/:id]` | admin | update allowlist: `name`, `role`, `status` |
| | GET `/admin/orders`, PUT `/admin/orders/:id/status` | admin | status transition, stock restore on cancel |

---

## 4. Frontend

### Routes (role-guarded where marked)

| Route | Page | Access |
|---|---|---|
| `/` | Home (hero, categories, featured artisans, stories, donate CTA) | public |
| `/products`, `/product/:id` | Listing (filters/sort/pagination), detail (add to cart, reviews) | public |
| `/artisans`, `/artisan/:id` | Directory (state/craft filters), profile + reviews | public |
| `/workshops`, `/workshop/:id` | Listing (filters, seatsLeft), detail + booking | public |
| `/gi-search` | GI tag directory | public |
| `/about`, `/stories`, `/stories/:slug` | Heritage / craft stories blog | public |
| `/donate` | Donation form (presets ₹100–₹2500, custom, anonymous) + impact feed | public (submit needs login) |
| `/verify`, `/verify/:certificateNumber` | Certificate verification | public |
| `/auth` | Login / Register (tabs) | guest |
| `/cart`, `/checkout`, `/orders`, `/order/:id`, `/my-bookings`, `/wishlist` | Shopping flow, order history/detail (cancel), bookings | CUSTOMER, ARTISAN |
| `/become-artisan` | Artisan application form + status | CUSTOMER |
| `/customer/dashboard` | Stats, quick actions, application status, recent orders | CUSTOMER |
| `/artisan/dashboard`, `/artisan/products`, `/artisan/orders`, `/artisan/workshops`, `/artisan/profile` | Artisan shell: stats, product CRUD, own orders + status updates, workshop CRUD + bookings, profile edit | ARTISAN |
| `/admin` (= `/admin/dashboard`) + `/admin/{orders,users,products,applications,workshops,donations,gi-tags,reviews}` | Admin shell: KPI cards + charts, order status management, user management, product CRUD, application approve/reject, workshop toggle, donations, GI tags, review moderation | ADMIN |

- **Guards:** `ProtectedRoute` (redirects to `/auth`, remembers where you were going). Header dropdown routes each role to its dashboard.
- **State:** `AuthContext` (token + profile, 401 interceptor) and `CartContext` (server-backed cart). Toasts via `components/Toast`.
- **Charts:** `Admin/DashboardCharts` — revenue/orders/users time series, status split, top categories, top artisans (Chart.js).

---

## 5. Database

12 collections: `users, artisans, artisanapplications, products, orders, workshops, workshopbookings, reviews, donations, certificates, gitags, craftstories`.
(Full field-by-field tables live in the README §"Collections & fields".)

**Indexes (verified against live DBs):**
- Text: `products(name,description,craftType)`, `gi_tags(name,description)`
- 2dsphere: `artisans.location`
- Unique: `users.email`, `artisan_applications.user` (one application/user), `certificates.certificateNumber`, `craft_stories.slug`, `gitags.name`, `reviews(user,product)` partial (product only)
- Compound: `orders(user,createdAt desc)`, `orders(orderStatus)`, `reviews(product,createdAt desc)`, `reviews(artisan)`, `reviews(rating)`, `workshops…` per model, `workshop_bookings(workshop,scheduleDate)`, `workshop_bookings(user)`, `artisans(city,state)`, `artisans(craftTypes)`, `craft_stories(category)`, `craft_stories(featured)`, `products(category/artisan/price)`, `certificates(qrCode)`, `artisan_applications(status)`
- **Duplicate-index warnings fixed (Step 9):** redundant `schema.index()` declarations on `user`, `certificateNumber`, `slug` removed; the unique indexes they duplicated are still declared via `unique: true` and were confirmed present (exactly once) in `craftveda`, `craftveda_dev` and a throwaway probe DB. No behaviour change.

**Seed (`npm run seed`, idempotent — find-or-create, never `deleteMany`):**
admin + 5 customers + 3 artisans (3 profiles), 10 products, 10 base orders + 11 back-dated chart orders, 3 workshops, 4 donations, 3 GI tags, 3 craft stories, 2 certificates (`CV-SEED-0001/0002`), 3 pending artisan applications.

---

## 6. Verification (Step 9 regression, 2026-11-16)

| Check | Result |
|---|---|
| `node tests/step4-reviews.e2e.mjs` | **28/28 PASS** |
| `node tests/step5-artisan.e2e.mjs` | **22/22 PASS** |
| `node tests/step6-workshops.e2e.mjs` | **42/42 PASS** |
| `node tests/step8-timeseries.e2e.mjs` | **14/14 PASS** |
| `npm run lint` (frontend, oxlint) | **PASS** — 0 errors, 48 warnings (exit 0) |
| `npm run build` (frontend, vite) | **PASS** — built in ~2.6s (chunk-size warning only) |
| Duplicate-index warnings | **GONE** (probe on throwaway DB: 0 warnings, unique indexes intact) |
| Console/debugger leftovers in src | **NONE** (only intentional startup/seed logs) |

E2E scripts use dedicated throwaway DBs (`craftveda_step{4,5,6,8}_test`) with hard guards against `craftveda` / `craftveda_dev`; each drops its DB on cleanup. **No step 1–3 E2E scripts exist in the repo** — steps 4, 5, 6, 8 are the complete test suite.

---

## 7. Known limitations / future work

1. **Multi-artisan orders have no per-item fulfillment.** An order spans products from several artisans but carries a single `orderStatus` (no per-line artisan status, split shipments, or partial delivery).
2. **Workshop bookings are never charged.** `workshop_bookings.paymentStatus` stays `pending`; no Razorpay flow for bookings.
3. **Donations are record-only.** `POST /donations` creates `pending`; the public feed/total only counts `completed`, so a new donation does not appear until a payment completes — and no payment step exists for donations in the UI ("CraftVeda does not process online payments" is stated on the page). Razorpay `referenceType: 'donation'` exists in the backend but is unused by the frontend.
4. **Razorpay test keys optional.** Without `RAZORPAY_KEY_ID/SECRET`, online payment methods return 500 "Razorpay is not configured"; **COD works fully without keys**.
5. **No image upload UI.** `multer`/`cloudinary` are installed but not wired; product `images[]` are strings entered manually. Nodemailer (password reset e-mail) and Google OAuth are not implemented. Certificate **generation** exists only as `POST /api/certificates/generate` (no UI button) — the UI only *verifies* certificates.
6. **Backend `npm run lint`** was `eslint src/` with eslint not installed — **fixed in Step 9** to use oxlint (same linter as the frontend).
7. **Frontend oxlint warnings (48):** mostly `react(set-state-in-effect)` and one `Date.now()` in render — warnings only, 0 errors, exit code 0.
8. **Single-file bundle (720 kB):** no code-splitting; Vite prints a chunk-size warning.
9. **Rate limiting is per-IP, not per-user**; production still needs a strong `JWT_SECRET` and real Razorpay test keys.

---

## 8. History (commits)

| Commit | Step |
|---|---|
| `06c621d` | Steps 1–3A: scaffolding, auth, products, artisan pages |
| `73cca85` | Step 3B: cart, checkout, orders, order detail |
| `6907f78` | Fix: Razorpay retry inside modal now verifies payment |
| `54309ce` | Step 4: reviews backend + UI, artisans pages (+ E2E) |
| `88e438a` | Step 5: artisan dashboard, my products, my orders (+ E2E) |
| `b084f76` | Step 6: workshops, artisan profile edit (+ E2E) |
| `cc84a08` | Step 7: home, GI search, donate, about, verify, stories |
| `202f267` | Step 8: admin dashboard charts (+ E2E) |
| (Step 9) | README, `.env.example`, index-warning fix, doc merge, cleanup, full regression |
