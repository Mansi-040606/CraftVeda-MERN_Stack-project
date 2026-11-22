# CraftVeda

**A heritage-craft marketplace connecting Indian artisans with buyers.**
Customers discover GI-tagged handicrafts, shop directly from verified artisans, book workshops and donate to craft preservation; artisans manage products, orders and workshops; admins moderate the whole platform — with a data-rich dashboard.

MERN stack · role-based JWT auth · Razorpay-ready payments (COD works with zero configuration) · authenticity certificates with QR verification.

---

## Features by role

### Customer
- Browse/search products with filters (category, craft type, price, sort, pagination) and full product detail pages (artisan story, GI tag, reviews)
- Cart and wishlist (server-side persisted), checkout with address validation
- Sign in with **email + password or Google** (Google-created accounts get a random unusable password and can set a real one later via Forgot password)
- **Forgot password with email OTP** — 6-digit code by email, 10-minute validity, 60-second resend cooldown, 5 codes/hour cap, single-use reset token
- Payment: **Cash on Delivery** (no keys needed) or Card/UPI/Net Banking/Wallet via Razorpay test mode
- Order history, order detail, order cancellation (restores stock)
- Reviews & ratings for purchased (delivered) products only — verified-purchase badge, "helpful" votes
- Book workshop seats (capacity + one-booking-per-user enforced), view/cancel bookings
- Donate to craft campaigns (preset or custom amount, anonymous option)
- Apply to become an artisan and track application status
- Verify authenticity certificates publicly at `/verify`
- Read GI tag directory and heritage craft stories

### Artisan
- Personal dashboard: products, active/low-stock, orders, items sold, revenue, rating, reviews, performance cards
- Full product CRUD (own products only, incl. inactive/draft listing)
- Own-orders view with item-level scope + status updates
- Workshop CRUD, booking roster per workshop (name, seats, date)
- Editable public profile (story, craft types, skills, awards, social links, bank details)
- Can shop like a customer (cart/checkout/orders/workshops)

### Admin
- Dashboard: KPI cards (users, orders, products, artisans, donations, revenue), recent orders, top products
- **Charts:** monthly revenue/orders/new-users time series (zero-filled, cancelled excluded), status split, top categories, top artisans
- Manage orders (filter by order/status, change status — cancelling restores stock)
- Manage users (role/status updates via allowlist, delete)
- Manage products (create/edit/delete, incl. inactive)
- Approve/reject artisan applications (approval creates the Artisan profile and upgrades the role)
- Moderate reviews (hide/approve — aggregates recalculated), toggle workshops, review donations, edit GI tags, CRUD craft stories

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · React Router v7 · Vite 8 · Tailwind CSS v4 · Axios · Chart.js / react-chartjs-2 · @react-oauth/google · Oxlint |
| Backend | Node.js (ESM) · Express 4 · Mongoose 8 · jsonwebtoken · bcryptjs · express-validator · helmet · morgan · express-rate-limit · qrcode · razorpay · google-auth-library · nodemailer |
| Database | MongoDB (local, `mongodb://localhost:27017/…`) |
| Tooling | Vite dev proxy (`/api` → `:5000`), idempotent seed script, 7 E2E scripts |

---

## Folder structure

```
CraftVeda/
├── README.md                 ← this file
├── PROJECT_STATUS.md         ← up-to-date status, API map, verification results
├── DATABASE_SCHEMA.docx      ← schema document (tables in §"Collections & fields" below)
├── backend/
│   ├── server.js             ← dotenv → connectDB → listen (PORT, default 5000)
│   ├── seed.js               ← idempotent demo data (npm run seed)
│   ├── .env.example          ← copy to .env
│   ├── src/
│   │   ├── app.js            ← middleware + 15 route mounts + /api/health
│   │   ├── config/db.js
│   │   ├── middleware/       ← auth (protect/adminOnly/artisanOnly/allowRoles), errorHandler, validate
│   │   ├── models/           ← 12 Mongoose models
│   │   ├── routes/           ← 15 route files
│   │   ├── controllers/      ← cart, password reset, wishlist, review, workshop, artisan stats, admin stats
│   │   ├── validators/       ← express-validator rule sets
│   │   ├── scripts/seedAdmin.js
│   │   └── utils/            ← ApiError, catchAsync, images, mailer (OTP e-mail), googleAuth
│   └── tests/                ← step4/5/6/8/10/11/12 E2E scripts
└── frontend/
    ├── index.html · vite.config.js (port 3000) · postcss.config.js · .oxlintrc.json
    ├── .env.example          ← copy to .env (VITE_GOOGLE_CLIENT_ID)
    ├── public/favicon.svg
    └── src/
        ├── App.jsx           ← all routes + role guards
        ├── components/       ← Header/Footer, ProtectedRoute, Toast, AdminShell, ArtisanShell,
        │                       OrderStatus, ProductCard, review components
        ├── context/          ← AuthContext, CartContext
        ├── pages/            ← 28 page directories (Home, Products, Artisans, Workshops, Cart,
        │                       Checkout, Orders, Auth, ForgotPassword, Admin/*, Artisan*, …)
        ├── services/         ← 15 axios service modules (auth, product, order, cart, adminApi, …)
        └── constants/, utils/format.js
```

---

## Prerequisites

- **Node.js** 18+ (tested on Node 24) and npm
- **MongoDB** Community running locally on port `27017` (default install)
- Two terminals (backend + frontend), ports **5000** and **3000** free
- *(Optional)* Razorpay **test** keys — only if you want to demo online payments
- *(Optional)* **Cloudinary** credentials — only if you want real image hosting
  (without them every image upload returns a clear `503 Image upload is not configured`)
- *(Optional)* a **Google OAuth Client ID** — only if you want the "Continue with Google"
  button (without it the button is hidden and `POST /api/auth/google` returns `503`)
- *(Optional)* **Gmail SMTP + App Password** — only if you want real forgot-password
  e-mails (without it, development prints the code to the backend console and
  production returns `503`)

---

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env if needed (MONGO_URI, JWT_SECRET)
npm run seed                # loads demo accounts, products, orders, workshops, stories…
npm run dev                 # http://localhost:5000  (auto-restarts on change)
```

`npm run seed` is **idempotent** — it finds-or-creates, so re-running never duplicates data.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # optional — only needed for VITE_GOOGLE_CLIENT_ID
npm run dev                 # http://localhost:3000  (proxies /api → :5000)
```

Open **http://localhost:3000** and sign in with any demo account below.

> Alternative admin bootstrap: `npm run seed-admin` (backend) creates `admin@craftveda.com` /
> `Admin@123456` if it does not exist. After `npm run seed` the password is **Admin@123**.

---

## Seeded demo accounts

All accounts use password **`Admin@123`** (after `npm run seed`):

| Email | Role | Notes |
|---|---|---|
| `admin@craftveda.com` | ADMIN | Full dashboard + moderation |
| `priya@craftveda.com` | CUSTOMER | Active buyer (has delivered orders → can review, has certificates) |
| `rahul@craftveda.com` | CUSTOMER | Active buyer |
| `anita@craftveda.com` | CUSTOMER | Active buyer |
| `vikram@craftveda.com` | CUSTOMER | **BLOCKED** (login/status demo) |
| `meena@craftveda.com` | CUSTOMER | **PENDING** status |
| `artisan1@craftveda.com` | ARTISAN | Pink City Block Prints (Jaipur, textiles) |
| `artisan2@craftveda.com` | ARTISAN | Blue Pottery Works (Jaipur, pottery) |
| `artisan3@craftveda.com` | ARTISAN | Sandalwood Carvings (Mysuru, woodwork) |

Seeded certificates for the `/verify` page: **`CV-SEED-0001`**, **`CV-SEED-0002`**.

---

## Environment variables

`backend/.env` (copy from `backend/.env.example`):

| Variable | Required | Default / example | Purpose |
|---|---|---|---|
| `PORT` | no | `5000` | Backend port |
| `MONGO_URI` | yes* | `mongodb://localhost:27017/craftveda` | Mongo connection (`*` falls back to the same URI) |
| `JWT_SECRET` | yes | placeholder in example | Signs tokens — **change it** for anything non-local |
| `NODE_ENV` | no | `development` | `production` enables real rate limits + hides stack traces |
| `CLIENT_URL` | yes | `http://localhost:3000` | CORS allow-list (comma-separated for several origins) |
| `RAZORPAY_KEY_ID` | **no** | *(empty)* | Razorpay test key id |
| `RAZORPAY_KEY_SECRET` | **no** | *(empty)* | Razorpay test key secret |
| `CLOUDINARY_CLOUD_NAME` | **no** | *(empty)* | Cloudinary cloud name — product/profile image hosting |
| `CLOUDINARY_API_KEY` | **no** | *(empty)* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | **no** | *(empty)* | Cloudinary API secret (server-side only, never logged) |
| `GOOGLE_CLIENT_ID` | **no** | *(empty)* | Google Web OAuth Client ID for "Continue with Google" — empty hides the button and makes `POST /api/auth/google` return 503 |
| `SMTP_HOST` | **no** | *(empty)* | SMTP server host, e.g. `smtp.gmail.com` |
| `SMTP_PORT` | **no** | `587` | SMTP port (`587` STARTTLS, `465` implicit TLS) |
| `SMTP_USER` | **no** | *(empty)* | SMTP login (full Gmail address) |
| `SMTP_PASS` | **no** | *(empty)* | SMTP password — for Gmail an **App Password**, never your real password |
| `MAIL_FROM` | **no** | *(empty)* | From header, e.g. `CraftVeda <you@gmail.com>` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | no | `admin@craftveda.com` / `Admin@123456` / `Admin` | Overrides for `npm run seed-admin` only |

`frontend/.env` (copy from `frontend/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | API base URL if the backend is not on localhost:5000 |
| `VITE_GOOGLE_CLIENT_ID` | *(empty)* | Same Google Client ID as the backend — empty hides the "Continue with Google" button |

> **Secrets rule:** `.env` files are git-ignored (`.env.example` files are committed
> with **empty values only**). Read credentials from `process.env` /
> `import.meta.env` only — never print, log or hardcode them. The only exception
> is the forgot-password **OTP itself**: when SMTP is not configured *and* the
> server is not in production, the 6-digit code is printed to the backend console
> so the flow can be tested locally. It is **never** logged when SMTP works.

> **Razorpay keys are optional.** Leave both empty and **Cash on Delivery works end-to-end**
> (order → status flow → cancellation → stock restore). Online payment options
> (Card/UPI/Net Banking/Wallet) return *"Razorpay is not configured"* until you add
> test-mode keys from the Razorpay dashboard.

---

## Google sign-in (setup)

The "Continue with Google" button on `/auth` sends a Google **ID token** to
`POST /api/auth/google`, which verifies it with `google-auth-library`
(audience = `GOOGLE_CLIENT_ID`, `email_verified` must be `true`).

1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**
   - User type **External**, fill the app name ("CraftVeda") and your email.
   - Scopes: keep the default (`email`, `profile`, `openid`) — no extra scopes needed.
   - **Test users → Add users** → add *your own Gmail address*. While the app is in
     "Testing" status only added test users can sign in.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**.
   - **Authorized JavaScript origins** → `http://localhost:3000`
     (add your production origin later, e.g. `https://your-domain.com`).
   - Authorized redirect URIs are **not** needed for the popup flow.
4. Copy the **Client ID** (`…apps.googleusercontent.com`) into:
   - `backend/.env` → `GOOGLE_CLIENT_ID=…`
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID=…`
5. Restart both servers. The button appears above the email form on `/auth`.

Behaviour (all covered by the E2E suite):

- **Existing account with that email** → logged in; `googleId` stored on first
  Google sign-in; **role/status never change** (an ARTISAN/ADMIN stays one).
- **New email** → created as `CUSTOMER` / `ACTIVE` with the Google name + avatar
  and a long random unusable password. Never `ADMIN`/`ARTISAN`.
- **BLOCKED** → `403 Account is blocked` (identical to a password login).
- **Unverified Google email** → `401`.
- **Missing `GOOGLE_CLIENT_ID`** → `503 Google sign-in is not configured`
  and the button is hidden in the UI.
- Google-created users can always set a real password later via **Forgot password**.

---

## Forgot-password e-mails (Gmail SMTP)

`POST /api/auth/forgot-password` e-mails a **6-digit code** (HMAC-hashed in the
DB, valid 10 minutes) through `nodemailer`. Setup with a Gmail **App Password**:

1. Your Google Account → **Security** → turn on **2-Step Verification**
   (App Passwords only appear once 2FA is on).
2. Security → **App passwords** (search "app passwords") → give it a name like
   `craftveda-smtp` → **Create** → Google shows a **16-character password** once.
3. Fill `backend/.env`:

   ```dotenv
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=xxxxxxxxxxxxxxxx    # the 16-char App Password, spaces removed
   MAIL_FROM=CraftVeda <you@gmail.com>
   ```

4. Restart the backend.

Without SMTP:

- **Development** (`NODE_ENV` ≠ `production`): the server prints a clear warning
  and the OTP itself to the console — the whole flow still works locally.
- **Production**: `503 Email service is not configured`.
- With SMTP configured the OTP is **never** written to any log.

Rate limits (all silent, always the same generic success message so responses
never reveal whether an e-mail is registered): **60-second resend cooldown**,
**5 codes per hour per e-mail**, **5 wrong codes** then the code is invalidated,
and the issued reset token is **single-use** (10 minutes). Endpoints sit behind
a dedicated 20-requests/15-min limiter keyed by IP + e-mail (login/register/
google keep the existing strict auth limiter).

---

## Running the E2E tests

Requires local MongoDB. Each script boots a real server on its own port, uses its own
**throwaway database**, and drops it afterwards — hard-guarded so it can **never** touch
`craftveda` or `craftveda_dev`.

```bash
cd backend

node tests/step4-reviews.e2e.mjs        # reviews, aggregates, moderation   → 28 tests
node tests/step5-artisan.e2e.mjs        # artisan stats + own orders        → 22 tests
node tests/step6-workshops.e2e.mjs      # workshop CRUD/booking/cancel      → 42 tests
node tests/step8-timeseries.e2e.mjs     # admin dashboard time-series       → 14 tests
node tests/step10-images.e2e.mjs        # image uploads (Cloudinary mocked) → 25 tests
node tests/step11-product-edit.e2e.mjs  # product edit load/duplicate/update → 26 tests
node tests/step12-auth-otp.e2e.mjs      # Google sign-in + OTP reset (both mocked) → 29 tests
```

Latest results: **28/28 · 22/22 · 42/42 · 14/14 · 25/25 · 26/26 · 29/29 — all passing.**
Free ports `5093–5099` before running. There are no step 1–3 test scripts; the seven above are the full suite.

> `step10` runs with `CLOUDINARY_MOCK=1` and fake credentials — **no real Cloudinary
> upload ever happens** — and it uses its own throwaway database.
>
> `step12` runs with `GOOGLE_TOKEN_MOCK=1` (the ID token is a local base64url
> payload, so Google is never contacted) and **blanks every SMTP variable**, so the
> development fallback prints the OTP to the server console where the test captures
> it — **no real e-mail is ever sent**. It restarts the server once without
> `GOOGLE_CLIENT_ID` to prove the 503 path.

Lint & build:

```bash
cd frontend
npm run lint      # oxlint — 0 errors (warnings only, exit 0)
npm run build     # vite production build → frontend/dist
```

---

## Collections & fields

> Generated from the Mongoose models — use this to update `DATABASE_SCHEMA.docx`.
> `→ Model` = ObjectId reference. Every collection also has Mongo `_id` plus Mongoose
> `createdAt` / `updatedAt` timestamps.

### users

| Field | Type | Notes |
|---|---|---|
| name | String | required, trim |
| email | String | required, **unique**, lowercase |
| password | String | required, min 6 — bcrypt(12) hashed on save, never returned |
| phone | String | |
| role | String | enum `CUSTOMER` \| `ARTISAN` \| `ADMIN`, default `CUSTOMER` |
| status | String | enum `ACTIVE` \| `PENDING` \| `BLOCKED`, default `ACTIVE` |
| avatar | String | |
| address | Object | `street`, `city`, `state`, `pincode`, `country` (default `India`) |
| wishlist | [→ Product] | |
| cart | [{ product → Product, quantity Number = 1 }] | |
| googleId | String | **sparse unique** — Google `sub` id; absent for password-only users (existing docs untouched) |
| resetPasswordToken | String | SHA-256 **hash** of the single-use reset token returned by `verify-otp` (never the raw token) |
| resetPasswordExpire | Date | reset-token expiry (10 min) |
| passwordResetOtpHash | String | HMAC-SHA256 (keyed with `JWT_SECRET`) of the 6-digit code — the code itself is never stored |
| passwordResetOtpExpires | Date | code expiry (10 min) |
| passwordResetOtpAttempts | Number | wrong-code counter; at 5 the code is invalidated |
| passwordResetOtpLastSentAt | Date | drives the 60-second resend cooldown |
| passwordResetOtpWindowStart / passwordResetOtpRequestCount | Date / Number | hourly window for the max-5-codes cap |
| createdAt / updatedAt | Date | managed by timestamps |

### artisans

| Field | Type | Notes |
|---|---|---|
| user | → User | required, 1:1 with users |
| businessName | String | required |
| description | String | required |
| story | String | artisan bio |
| profileImage / coverImage | String | |
| craftTypes | [String] | required |
| skills | [String] | |
| location | GeoJSON-ish Object | `type` = `Point` (default), `coordinates` [Number] = `[0,0]`, `address`, `city`, `state`, `pincode` — **2dsphere index** |
| giTag | → GITag | |
| yearsOfExperience | Number | |
| awards | [{ title, year, description }] | |
| socialLinks | Object | `instagram`, `facebook`, `website` |
| bankDetails | Object | `accountHolder`, `accountNumber`, `ifsc`, `bankName` |
| isVerified | Boolean | default `false` |
| rating | Number | default 0, synced by reviews |
| reviewCount | Number | default 0 |
| totalProducts / totalSales | Number | default 0 |
| createdAt / updatedAt | Date | |

### artisanapplications

| Field | Type | Notes |
|---|---|---|
| user | → User | required, **unique** (one application per user) |
| businessName | String | required, trim |
| description | String | required |
| craftTypes | [String] | required |
| skills | [String] | |
| yearsOfExperience | Number | required |
| location | Object | `address`, `city`, `state`, `pincode`, `country` (default `India`) |
| portfolio | String | |
| status | String | enum `PENDING` \| `APPROVED` \| `REJECTED`, default `PENDING` |
| adminNotes | String | |
| reviewedAt | Date | |
| reviewedBy | → User | admin who decided |
| createdAt / updatedAt | Date | |

### products

| Field | Type | Notes |
|---|---|---|
| name | String | required, trim |
| description | String | required |
| price | Number | required, min 0 — server-priced at checkout |
| images | [String] | no upload UI yet |
| category | String | required, enum `textiles`, `pottery`, `jewelry`, `woodwork`, `metalwork`, `painting`, `sculpture`, `embroidery`, `other` |
| craftType | String | required |
| material | String | |
| dimensions | Object | `length`, `width`, `height`, `unit` (default `cm`) |
| weight | Number | |
| color | [String] | |
| stock | Number | default 1, min 0 — atomically decremented on order |
| averageRating | Number | default 0, synced by reviews |
| reviewCount | Number | default 0 |
| artisan | → Artisan | required |
| giTag | → GITag | |
| isCustomizable | Boolean | default `false` |
| customizationOptions | [{ name, options [String], additionalPrice }] | |
| tags | [String] | |
| isActive | Boolean | default `true` — hidden from public list when false |
| createdAt / updatedAt | Date | **text index** on `name`+`description`+`craftType` |

### orders

| Field | Type | Notes |
|---|---|---|
| user | → User | required |
| items | [{ product → Product (req), quantity Number ≥1 (req), price Number (req, from DB), customization { option, value } }] | |
| shippingAddress | Object | `street`, `city`, `state`, `pincode` required; `country` default `India` |
| subtotal | Number | required, server-computed |
| shippingCost | Number | default 0 (free over ₹500, else ₹50) |
| tax | Number | default 0 (18% GST, rounded) |
| total | Number | required |
| paymentMethod | String | enum `cod` \| `card` \| `upi` \| `netbanking` \| `wallet`, default `cod` |
| paymentStatus | String | enum `pending` \| `paid` \| `failed` \| `refunded`, default `pending` |
| paymentId | String | Razorpay payment id when verified |
| orderStatus | String | enum `pending` \| `confirmed` \| `processing` \| `shipped` \| `delivered` \| `cancelled`, default `pending` |
| trackingNumber / trackingUrl | String | |
| certificate | → Certificate | |
| notes | String | also used by seed markers |
| createdAt / updatedAt | Date | indexes: `(user, createdAt desc)`, `(orderStatus)` |

### workshops

| Field | Type | Notes |
|---|---|---|
| artisan | → Artisan | required |
| title | String | required |
| description | String | required |
| craftType | String | required |
| duration | Number | required |
| durationUnit | String | enum `minutes` \| `hours` \| `days`, default `hours` |
| maxParticipants | Number | required, min 1 |
| currentParticipants | Number | default 0 |
| price | Number | required, min 0 — charged server-side at booking |
| images | [String] | |
| videoUrl | String | |
| schedule | [{ date Date, startTime String, endTime String, isBooked Boolean = false }] | |
| materials | [{ name, description }] | |
| level | String | enum `beginner` \| `intermediate` \| `advanced` \| `all`, default `all` |
| language | String | default `English` |
| location | Object | `type` enum `online` \| `offline` \| `hybrid` (default `online`), `address`, `city`, `state` |
| isActive | Boolean | default `true` |
| rating / totalReviews | Number | default 0 |
| createdAt / updatedAt | Date | |

### workshopbookings

| Field | Type | Notes |
|---|---|---|
| workshop | → Workshop | required |
| user | → User | required (one booking per user per workshop) |
| scheduleDate | Date | required — must be a future slot |
| startTime / endTime | String | required, copied from the schedule slot |
| participants | Number | default 1 (bounded by remaining seats) |
| amount | Number | required — computed server-side |
| paymentStatus | String | enum `pending` \| `paid` \| `failed` \| `refunded`, default `pending` — **never charged** |
| paymentId | String | |
| status | String | enum `booked` \| `confirmed` \| `completed` \| `cancelled`, default `booked` |
| joinLink | String | |
| materialsSent | Boolean | default `false` |
| feedback | Object | `rating`, `comment` |
| createdAt / updatedAt | Date | indexes: `(workshop, scheduleDate)`, `(user)` |

### reviews

| Field | Type | Notes |
|---|---|---|
| user | → User | required |
| product | → Product | set for product reviews (nullable) |
| workshop | → Workshop | set for workshop reviews (nullable) |
| artisan | → Artisan | derived from the product on create |
| rating | Number | required, min 1, max 5 |
| title | String | max 100 |
| comment | String | max 1000 |
| images | [String] | |
| isVerifiedPurchase | Boolean | default `false` — true when the reviewer had a delivered order |
| isApproved | Boolean | default `true` — admin moderation toggle |
| helpful | Number | default 0 = count of `helpfulBy` |
| helpfulBy | [→ User] | one vote per user |
| createdAt / updatedAt | Date | **partial unique index** `(user, product)` where `product` exists |

### donations

| Field | Type | Notes |
|---|---|---|
| donor | → User | required |
| amount | Number | required, min 1 |
| campaign | → Campaign | ref declared; **no Campaign model exists** (never populated) |
| craftType | String | |
| message | String | max 500 |
| paymentId | String | |
| paymentStatus | String | enum `pending` \| `completed` \| `failed` \| `refunded`, default `pending` — public feed counts `completed` only |
| isAnonymous | Boolean | default `false` |
| createdAt / updatedAt | Date | |

### certificates

| Field | Type | Notes |
|---|---|---|
| order | → Order | required (1:1 per order+product) |
| product | → Product | required |
| artisan | → Artisan | required |
| buyer | → User | required |
| certificateNumber | String | required, **unique** (e.g. `CV-SEED-0001`, `CV-<ts>-<rand>`) |
| qrCode | String | data-URL QR payload |
| issuedAt | Date | default now |
| authenticityHash | String | optional |
| craftDetails | Object | `craftType`, `material`, `technique`, `origin` |
| isValid | Boolean | default `true` (revocable) |
| createdAt / updatedAt | Date | index: `(qrCode)` |

### gitags

| Field | Type | Notes |
|---|---|---|
| name | String | required, **unique** |
| type | String | required (e.g. `Textiles`, `Embroidery`, `Woodwork`) |
| description | String | required |
| location | Object | `state` required, `district`, `region` |
| products | [String] | product kinds, free text |
| artisans | [→ Artisan] | linked profiles |
| history / significance / technique | String | |
| images | [String] | |
| wikipediaUrl | String | |
| isActive | Boolean | default `true` |
| createdAt / updatedAt | Date | **text index** on `name`+`description`; index on `location.state` |

### craftstories

| Field | Type | Notes |
|---|---|---|
| title | String | required |
| slug | String | required, **unique** (URL key) |
| content | String | required |
| excerpt | String | max 300 |
| coverImage | String | |
| category | String | enum `history` \| `technique` \| `artisan-story` \| `heritage` \| `preservation` \| `other`, default `heritage` |
| craftType | String | |
| region | String | |
| featured | Boolean | default `false` |
| publishedAt | Date | |
| author | → User | |
| tags | [String] | |
| readTime | Number | minutes |
| createdAt / updatedAt | Date | indexes: `(category)`, `(featured)` |

---

## Known limitations / future work

1. **Per-item fulfillment for multi-artisan orders** — an order can contain products from several artisans, but the order has a *single* `orderStatus`; there is no per-line artisan status, split shipping or partial delivery.
2. **Workshop payments** — bookings record `paymentStatus: pending` and never go through Razorpay; the seat is granted without charge.
3. **Donation payments** — donations are created `pending` and the public feed totals only `completed` ones; the UI explicitly records donations without charging, and the backend's Razorpay donation path is unused by the frontend.
4. **Razorpay is test-mode only** and optional (see Environment variables); no refunds flow even though `refunded` exists as a status.
5. **Password rules are deliberately minimal** — register and reset-password both require only **min 6 characters**, so existing accounts and tests keep working. Suggested hardening (not implemented): min 8 with upper/lower/digit/symbol, a breached-password check (e.g. HaveIBeenPwned k-anonymity), and progressive lockout on repeated login failures.
6. **Certificate generation is API-only** (`POST /api/certificates/generate`); the UI only verifies certificates.
7. **No code-splitting** — the production bundle is a single ~775 kB chunk (Vite warns); lint reports React warnings (0 errors).

---

## Scripts reference

| Where | Command | Does |
|---|---|---|
| backend | `npm run dev` | `node --watch server.js` |
| backend | `npm start` | `node server.js` |
| backend | `npm run seed` | idempotent demo data |
| backend | `npm run seed-admin` | create/ensure admin only |
| backend | `npm run lint` | oxlint over `src/` |
| frontend | `npm run dev` | Vite dev server on :3000 |
| frontend | `npm run build` | production build → `dist/` |
| frontend | `npm run lint` | oxlint |
