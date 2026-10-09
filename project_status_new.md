# Project Status (New) — CraftVeda Backend

Date: 2026-10-01
Scope: 10 requested backend tasks (all completed), verification results, and open errors/bugs.

---

## 1. Changes Completed

### Task 1 — `validate` middleware in auth routes
**File:** `src/routes/auth.js`
- Added `import validate from '../middleware/validate.js';` (line 5).
- `/register` (line 16-20): added `validate` after the validation rules array, before handler.
- `/login` (line 47-50): added `validate` after the validation rules array, before handler.
- Effect: validation failures now return HTTP 400 `{success:false, message:'Validation failed', errors:[...]}` instead of reaching the handler.

### Task 2 — Orders: server-side pricing, ignore client `item.price`
**File:** `src/routes/orders.js`
- Added `import Product from '../models/Product.js';` (line 4).
- `POST /` (line 68):
  - Client `item.price` is never read; only `product` + `quantity` come from the client.
  - Products fetched in one query: `Product.find({ _id: { $in: productIds } })`, mapped by id.
  - Each line validated: product exists (404), `product.isActive` (400), stock check (400 with product name).
  - Order item price set from DB: `price: product.price`.
  - `subtotal`/`shippingCost` (free over ₹500, else ₹50)/`tax` (18%, rounded)/`total` all computed server-side from DB prices.

### Task 3 — Atomic stock decrement on create, restore on cancel
**File:** `src/routes/orders.js`
- Create (line ~93): atomic decrement per line:
  ```js
  Product.updateOne({ _id, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } })
  ```
  - `modifiedCount === 0` → HTTP 400 "Insufficient stock".
  - Rollback: all previously decremented lines are restored (`$inc` +qty) if any line fails, so a failed create never leaks stock.
- Cancel `PUT /:id/cancel` (line 125): after status → `cancelled`, stock restored for every item (`$inc` +qty via `Promise.all`).

### Task 4 — Donation created as pending
**File:** `src/routes/donations.js`
- `POST /` now sets `paymentStatus: 'pending'` (was `'completed'`).
- Donation only becomes `completed` after Razorpay verification (task 5).

### Task 5 — Real Razorpay integration (test mode)
**Files:** `src/routes/payments.js` (rewritten), `package.json`
- Installed dependency: `razorpay@^2.9.8`.
- Keys read from env at request time: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (500 "Razorpay is not configured" if missing).
- `POST /api/payments/create-order` (`protect`):
  - Body: `{ currency = 'INR', referenceType: 'order'|'donation', referenceId }`.
  - Loads the Order/Donation, enforces ownership (`order.user` / `donation.donor` == `req.user._id`), rejects already-paid, and creates the Razorpay order with a **server-computed amount** (`total`/`amount` × 100 paise).
  - Receipt encodes target: `` `${referenceType}_${referenceId}` ``.
  - Returns `{ success, key, razorpayOrderId, amount, currency }`.
- `POST /api/payments/verify` (`protect`):
  - Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
  - Fetches the Razorpay order (invalid id → 400) to read the trusted `receipt` + `amount`.
  - HMAC-SHA256(`${order_id}|${payment_id}`, `RAZORPAY_KEY_SECRET`) compared with `crypto.timingSafeEqual` (length-guarded) → 400 on mismatch.
  - Amount re-checked against `order.total` / `donation.amount`.
  - Marks paid: Order → `paymentStatus:'paid'`, `paymentId`, and `orderStatus` `pending` → `confirmed`; Donation → `paymentStatus:'completed'`, `paymentId`.

### Task 6 — Review "helpful" one-vote-per-user
**Files:** `src/models/Review.js`, `src/routes/reviews.js`
- Schema: added `helpfulBy: [{ type: ObjectId, ref: 'User' }]` (line 15).
- `PUT /:id/helpful` (line 50): `{ $addToSet: { helpfulBy: req.user._id } }` (repeat vote is a no-op), 404 if missing, then `helpful = helpfulBy.length` so the counter always equals unique voters.

### Task 7 — Admin `PUT /users/:id` allowlist
**File:** `src/routes/admin.js` (line 52)
- Body no longer passed through wholesale. Allowlist: `['name', 'role', 'status']` (only present fields copied), then `findByIdAndUpdate(..., { new: true, runValidators: true })`.
- Rejected any other field (`password`, `email`, `wishlist`, etc.) is dropped.
- **Spec note:** task text said `isActive`, but the User model has no `isActive` field — its equivalent is `status: enum['ACTIVE','PENDING','BLOCKED']`. Allowlisted `status` instead. If `isActive` was really intended, the User schema must first be changed.

### Task 8 — Admin order routes
**File:** `src/routes/admin.js`
- `GET /api/admin/orders` (line 64, `protect + adminOnly`): paginated list of all orders, filters `?orderStatus=` & `?paymentStatus=`, sorted `-createdAt`, `user` + `items.product` populated.
- `PUT /api/admin/orders/:id/status` (line 87, `protect + adminOnly`): validates against enum `pending|confirmed|processing|shipped|delivered|cancelled` (400 otherwise), 404 if missing, and restores stock when transitioning to `cancelled` (guarded so re-setting `cancelled` can't double-restore).

### Task 9 — artisans.js static import
**File:** `src/routes/artisans.js`
- Added `import Product from '../models/Product.js';` (line 3).
- `GET /:id/products`: removed `(await import('../models/Product.js')).default`; uses the top-level import.

### Task 10 — CORS / secrets / .env.example
**Files:** `src/app.js`, `.env.example` (new), `.env`
- `app.js` line 23-36: replaced `cors()` with an origin callback restricted to `process.env.CLIENT_URL` (comma-separated list supported, trimmed). Allowed/absent-Origin requests proceed; foreign origins get no `Access-Control-Allow-Origin` (browser blocks). `credentials: true` set.
- The origin is read **per request** — required because ESM import evaluation runs before `dotenv.config()` in `server.js` (see Bugs #2).
- `JWT_SECRET`: verified env-only — `src/routes/auth.js:13` and `src/middleware/auth.js:18` both read `process.env.JWT_SECRET` with no hardcoded fallback.
- New `.env.example`:
  ```
  PORT=5000
  MONGO_URI=mongodb://localhost:27017/craftveda
  JWT_SECRET=your-super-secret-jwt-key-change-in-production
  NODE_ENV=development
  CLIENT_URL=http://localhost:3000
  RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=your-razorpay-key-secret
  ```
- Added `CLIENT_URL=http://localhost:3000` to `.env` (frontend Vite dev server runs on port 3000).

---

## 2. Verification Performed

| Check | Result |
|---|---|
| `node --check` on every file under `src/` | PASS (all files) |
| `node -e "import('./src/app.js')"` — full module graph loads | PASS (`APP OK`) |
| `razorpay` package resolution | installed, resolves |
| `npm run lint` | **FAIL** — see Bug #1 |
| Live HTTP/E2E test (orders/payments flow) | **NOT RUN** — see Bug #3 |

---

## 3. Errors / Bugs Found (and status)

### Bug #1 — `npm run lint` is broken (UNRESOLVED)
- `package.json` defines `"lint": "eslint src/"` but `eslint` is not in dependencies/devDependencies and not installed → `'eslint' is not recognized as an internal or external command`.
- Fix needed: `npm i -D eslint` + an ESLint config (or change the script to `oxlint`, as the frontend uses).
- Workaround used for this session: `node --check` on all sources.

### Bug #2 — Env vars are loaded AFTER route modules evaluate (UNRESOLVED, mitigated in changed code)
- `server.js` order:
  ```js
  import dotenv from 'dotenv';
  dotenv.config();          // statement → runs AFTER all imports are evaluated
  import app from './src/app.js';
  ```
  ES imports are hoisted, so `src/**` module bodies execute before `dotenv.config()` populates `process.env`.
- Impact: any **module-level** `process.env.X` read gets `undefined` for the whole process.
- Mitigations applied in this pass:
  - Razorpay client is built lazily inside the request handlers (`getRazorpay()`).
  - CORS origin is read inside the per-request callback.
  - `JWT_SECRET`/`MONGO_URI` were already read inside functions.
- Recommended real fix: move `dotenv.config()` into an `import 'dotenv/config'` side-effect import (first import) or a `src/config/env.js` imported first.

### Bug #3 — Server could not be booted for E2E testing (ENVIRONMENT)
- `localhost:27017` refused connection → no local MongoDB running, so the API flow (order create → stock decrement → Razorpay → cancel restore) was **not** exercised end-to-end.
- Action: start MongoDB, then manually run `npm run dev` and smoke-test `/api/health` plus the flows above.
- Also note: Razorpay test calls need real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` test-mode values in `.env`; currently not present → endpoints return 500 "Razorpay is not configured".

### Bug #4 — Spec/schema mismatch: `isActive` vs `status` on User (RESOLVED BY CHOICE, flagged)
- Task 7 said allowlist `isActive`; `src/models/User.js` has no such field (it has `status: ACTIVE|PENDING|BLOCKED`; `isActive` exists on Product/Workshop/GITag only).
- Resolved by allowlisting `status`. If `isActive` was intended as a separate boolean, add it to the User schema first.

### Bug #5 — Cart with the same product on two lines (EDGE CASE, handled)
- Initial stock check uses one snapshot of the product; two lines of the same product both pass the pre-check, then the **second atomic `$gte` decrement fails** → the whole request rolls back its already-taken stock and returns 400.
- Behavior is safe (no leak, no oversell) but returns "Insufficient stock" even when the combined quantity might have been valid. Proper fix: merge duplicate `product` ids and sum quantities before validation.

### Bug #6 — Admin cancel vs user cancel stock restore (HANDLED)
- Both `PUT /orders/:id/cancel` (user) and `PUT /admin/orders/:id/status → cancelled` (admin) now restore stock; the admin path is guarded with `order.orderStatus !== 'cancelled'` to avoid double-restore.
- Remaining edge: if an order was **already** `cancelled` the user route rejects with 400 ("Cannot cancel this order") — OK.
- Open question (product decision): should stock be restored when a **paid** order is cancelled (refund flows)? Currently it is restored unconditionally, per spec.

### Bug #7 — Donations feed now hides pending donations (EXPECTED BEHAVIOR CHANGE)
- `GET /donations` filters `paymentStatus: 'completed'`, and creations are now `pending`, so newly created donations no longer appear on the public feed/aggregates until payment verification succeeds.
- Frontend may show "empty list" right after donating if it expects immediate visibility.

### Bug #8 — npm audit reports 5 vulnerabilities (UNRESOLVED)
- Output after `npm install razorpay`: `5 vulnerabilities (4 moderate, 1 high)`.
- Action: run `npm audit` / `npm audit fix` (avoid `--force` without review).

### Bug #9 — No `backend/.gitignore` (UNRESOLVED)
- Workspace is not a git repo, and there is no backend `.gitignore`, so `.env` (with `JWT_SECRET`, Razorpay keys) would be committed if the repo is initialized.
- Action: add a `.gitignore` containing `node_modules/`, `.env`, and `dist/`.

### Bug #10 — Weak/default secrets in `.env` (UNRESOLVED)
- `JWT_SECRET=your-super-secret-jwt-key-change-in-production` is the documented placeholder; must be replaced with a strong random value in production.
- Razorpay keys are absent entirely (required before payments work in test mode).

---

## 4. Files Touched

| File | Change |
|---|---|
| `src/routes/auth.js` | `validate` on register/login |
| `src/routes/orders.js` | DB pricing, atomic stock decrement + rollback, stock restore on cancel |
| `src/routes/donations.js` | `paymentStatus: 'pending'` |
| `src/routes/payments.js` | rewritten: Razorpay create-order + HMAC verify + mark paid |
| `src/routes/reviews.js` | `$addToSet helpfulBy`, counter sync, 404 |
| `src/models/Review.js` | `helpfulBy: [ObjectId]` |
| `src/routes/admin.js` | users allowlist, `GET /orders`, `PUT /orders/:id/status` |
| `src/routes/artisans.js` | static `Product` import |
| `src/app.js` | CORS restricted to `CLIENT_URL` (lazy), `credentials: true` |
| `.env.example` | created (PORT, MONGO_URI, JWT_SECRET, NODE_ENV, CLIENT_URL, RAZORPAY_*) |
| `.env` | added `CLIENT_URL=http://localhost:3000` |
| `package.json` / `package-lock.json` | added `razorpay@^2.9.8` |
