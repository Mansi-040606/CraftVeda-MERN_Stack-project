# CraftVeda — Project Status Summary

> **Date:** 2026-09-21
> **Mode:** Read-only inspection (no files modified)

---

## 1. Project Structure

```
CraftVeda/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/auth.js, errorHandler.js
│   │   ├── models/ (12 models)
│   │   ├── routes/ (13 route files)
│   │   ├── scripts/seedAdmin.js
│   │   ├── utils/ApiError.js, catchAsync.js
│   │   └── app.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/favicon.svg, icons.svg
│   ├── src/
│   │   ├── components/layout/Header.jsx, Footer.jsx, index.js
│   │   ├── components/ProtectedRoute.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/ (18 page directories)
│   │   ├── services/ (8 service files)
│   │   ├── App.jsx, main.jsx, index.css
│   │   └── ...
│   ├── package.json
│   ├── postcss.config.js
│   └── vite.config.js
```

**Total source files (excluding node_modules):** ~60

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React | ^19.2.8 |
| | React Router DOM | ^7.5.1 |
| | Vite | ^8.2.2 |
| | Tailwind CSS (v4) | ^4.3.3 |
| | Axios | ^1.8.4 |
| | PostCSS + Autoprefixer | ^8.5.26 / ^10.5.4 |
| | Linter: Oxlint | ^1.79.0 |
| **Backend** | Node.js | Not pinned (ESM) |
| | Express | ^4.18.3 |
| | Mongoose | ^8.2.1 |
| | JWT (jsonwebtoken) | ^9.0.2 |
| | bcryptjs | ^2.4.3 |
| | express-validator | ^7.0.1 |
| | Cloudinary | ^2.0.1 |
| | Multer | ^1.4.5-lts.1 |
| | QRCode | ^1.5.3 |
| | Nodemailer | ^6.9.12 |
| | Helmet | ^7.1.0 |
| | Morgan | ^1.10.0 |
| | express-rate-limit | ^7.2.0 |
| | dotenv | ^16.4.5 |
| | cors | ^2.8.5 |
| **Database** | MongoDB (Mongoose ODM) | ^8.2.1 |
| **Runtime** | Vite dev proxy → localhost:5000 | |

**Tailwind v4** — uses `@theme` directive in CSS (no `tailwind.config.js` needed). Custom theme: primary (#8B4513 sienna), secondary (#D4A574 tan), accent (#AA3BFF purple), cream background.

---

## 3. Backend Details

### Server Config
- **Port:** 5000 (from `.env`)
- **Middleware stack:** Helmet → CORS → JSON parser → Morgan (dev) → Rate limiter (100 req/15min on `/api/`)
- **DB:** `mongodb://localhost:27017/craftveda` (direct connect, no replica set)
- **JWT Secret:** `your-super-secret-jwt-key-change-in-production` (placeholder)

### Database Connection (`config/db.js`)
- `mongoose.connect(MONGO_URI)` — no deprecated options, clean
- Event listeners for `disconnected` and `error`

### All API Routes

| Route | Methods | Auth | Description |
|---|---|---|---|
| `/api/health` | GET | Public | Health check |
| **Auth** | | | |
| `/api/auth/register` | POST | Public | Register (CUSTOMER) |
| `/api/auth/login` | POST | Public | Login |
| `/api/auth/me` | GET | Protected | Get profile |
| `/api/auth/profile` | PUT | Protected | Update profile |
| `/api/auth/password` | PUT | Protected | Change password |
| **Products** | | | |
| `/api/products` | GET | Public | List (paginated, filterable) |
| `/api/products/:id` | GET | Public | Get by ID |
| `/api/products` | POST | Admin | Create product |
| `/api/products/:id` | PUT | Admin | Update product |
| `/api/products/:id` | DELETE | Admin | Delete product |
| **Artisans** | | | |
| `/api/artisans` | GET | Public | List verified artisans |
| `/api/artisans/:id` | GET | Public | Get artisan profile |
| `/api/artisans/:id/products` | GET | Public | Get artisan's products |
| `/api/artisans` | POST | Artisan/Admin | Create artisan profile |
| `/api/artisans/:id` | PUT | Artisan/Admin | Update artisan |
| **Artisan Applications** | | | |
| `/api/artisan-applications` | POST | Customer | Submit application |
| `/api/artisan-applications` | GET | Admin | List all applications |
| `/api/artisan-applications/my-application` | GET | Customer | My application status |
| `/api/artisan-applications/:id` | GET | Protected | Get application |
| `/api/artisan-applications/:id/approve` | PUT | Admin | Approve → creates Artisan + updates User role |
| `/api/artisan-applications/:id/reject` | PUT | Admin | Reject application |
| **Workshops** | | | |
| `/api/workshops` | GET | Public | List workshops |
| `/api/workshops/:id` | GET | Public | Get workshop |
| `/api/workshops/:id/book` | POST | Protected | Book workshop |
| `/api/workshops/my-bookings` | GET | Protected | My bookings |
| **Orders** | | | |
| `/api/orders` | GET | Protected | List user's orders |
| `/api/orders/:id` | GET | Protected | Get order detail |
| `/api/orders` | POST | Protected | Create order (calculates subtotal, shipping, 18% GST) |
| `/api/orders/:id/cancel` | PUT | Protected | Cancel order |
| **Payments** | | | |
| `/api/payments/create-order` | POST | Protected | Stub — returns options object |
| `/api/payments/verify` | POST | Protected | Stub — returns success |
| **Reviews** | | | |
| `/api/reviews/product/:productId` | GET | Public | Product reviews + avg rating |
| `/api/reviews/artisan/:artisanId` | GET | Public | Artisan reviews |
| `/api/reviews` | POST | Protected | Create review |
| `/api/reviews/:id/helpful` | PUT | Protected | Increment helpful |
| **Donations** | | | |
| `/api/donations` | GET | Public | List donations + total |
| `/api/donations` | POST | Protected | Create donation |
| **Certificates** | | | |
| `/api/certificates/:certificateNumber` | GET | Public | Get certificate |
| `/api/certificates/generate` | POST | Protected | Generate (QR code) |
| `/api/certificates/verify/:certificateNumber` | GET | Public | Verify validity |
| **GI Tags** | | | |
| `/api/gi-tags` | GET | Public | List GI tags |
| `/api/gi-tags/:id` | GET | Public | Get GI tag |
| **Craft Stories** | | | |
| `/api/craft-stories` | GET | Public | List stories |
| `/api/craft-stories/:slug` | GET | Public | Get story by slug |
| `/api/craft-stories` | POST | Admin | Create story |
| `/api/craft-stories/:id` | PUT | Admin | Update story |
| `/api/craft-stories/:id` | DELETE | Admin | Delete story |
| **Admin** | | | |
| `/api/admin/stats` | GET | Admin | Dashboard stats |
| `/api/admin/users` | GET | Admin | List users |
| `/api/admin/users/:id` | PUT | Admin | Update user |
| `/api/admin/users/:id` | DELETE | Admin | Delete user |

### Auth/Roles
- **JWT-based** with Bearer token, 30-day expiry
- **3 roles:** CUSTOMER, ARTISAN, ADMIN
- **Middleware:** `protect` (JWT verify), `adminOnly`, `artisanOnly`, `allowRoles(...roles)`
- Password hashing: bcrypt 12 rounds via Mongoose pre-save hook

### Error Handling
- Custom `ApiError` class with statusCode
- `catchAsync` wrapper for all async routes
- `errorHandler` middleware handles: CastError (404), duplicate key (400), ValidationError (400), generic (500)
- Stack trace exposed only in development mode

### Validation
- `express-validator` used only in auth routes (register/login)
- **All other routes have NO input validation** — relies entirely on Mongoose schema validators

---

## 4. Frontend Details

### Pages (18)

| Page | Route | Description |
|---|---|---|
| Home | `/` | Hero, categories, featured artisans, heritage stories, donate CTA |
| Products | `/products` | Listing with sidebar filters, sort, pagination |
| ProductDetail | `/product/:id` | Product view, add to cart, artisan story, GI tag |
| Artisans | `/artisans` | Directory with state/craft filters |
| ArtisanProfile | `/artisan/:id` | Profile, story, products, awards |
| Workshops | `/workshops` | Workshop listing with enrollment progress |
| Cart | `/cart` | Cart with quantity controls, order summary |
| Wishlist | `/wishlist` | Wishlist with move-to-cart/remove |
| Checkout | `/checkout` | Address form, payment method, order summary |
| Orders | `/orders` | Order history with status badges |
| GISearch | `/gi-search` | GI Tag directory |
| About | `/about` | Heritage Stories blog |
| Donate | `/donate` | Donation form with preset/custom amounts |
| Auth | `/auth` | Login/Register with Google sign-in button |
| Admin | `/admin`, `/admin/dashboard` | Admin dashboard (Protected) |
| CustomerDashboard | `/customer/dashboard` | Customer dashboard (Protected) |
| ArtisanDashboard | `/artisan/dashboard` | Artisan dashboard (Protected) |
| BecomeArtisan | `/become-artisan` | Application form (Protected: CUSTOMER) |

### Components
- **Header** — Sticky nav with logo, links, cart/wishlist icons, auth dropdown (Dashboard/Become Artisan/My Orders/Logout)
- **Footer** — 4-column layout with brand, shop, discover, support links
- **ProtectedRoute** — Auth guard with role checking, redirects to `/auth`

### Routing
- `react-router-dom` v7 with `BrowserRouter`
- Role-based route protection via `ProtectedRoute` component
- All routes wrapped in `AuthProvider`

### Auth Flow
1. `AuthContext` manages user state + token in localStorage
2. On mount, if token exists → fetches profile via `/api/auth/me`
3. Login/Register → stores token → fetches profile → sets user
4. Axios interceptor auto-attaches Bearer token
5. 401 response → clears token → redirects to `/auth`
6. Role-based dashboard routing after login

### API Integration
- **Axios instance** with base URL `http://localhost:5000/api` (or `VITE_API_URL`)
- Vite dev proxy: `/api` → `http://localhost:5000`
- **8 service modules:** auth, product, order, artisan, artisanApplication, workshop, donation, api
- All services use the centralized axios instance

### UI Status
- Tailwind v4 with custom earth-tone theme
- All 18 pages have full JSX content (not stubs)
- Responsive layout (min-h-screen flex column)
- **No UI component library** (no shadcn, MUI, etc.) — pure Tailwind
- **No state management library** (no Redux/Zustand) — Context API only for auth

---

## 5. Database

### Collections (12)

| Collection | Key Fields | Relationships |
|---|---|---|
| **users** | name, email, password, phone, role, status, avatar, address, wishlist[], cart[], resetPasswordToken/Expire | — |
| **products** | name, description, price, images[], category (9 enums), craftType, material, artisan→Artisan, giTag→GITag, isCustomizable, stock, isActive | Artisan, GITag |
| **orders** | user→User, items[{product→Product, quantity, price, customization}], shippingAddress, subtotal, shippingCost, tax, total, paymentMethod, paymentStatus, orderStatus (6 states), certificate→Certificate | User, Product, Certificate |
| **artisans** | user→User, businessName, description, story, profileImage, craftTypes[], skills[], location(GeoJSON), giTag→GITag, isVerified, rating, totalProducts, totalSales | User, GITag |
| **artisan_applications** | user→User (unique), businessName, craftTypes[], skills[], status (PENDING/APPROVED/REJECTED), adminNotes, reviewedBy→User | User |
| **workshops** | artisan→Artisan, title, craftType, price, maxParticipants, schedule[], materials[], level, language, location{type,url} | Artisan |
| **workshop_bookings** | workshop→Workshop, user→User, scheduleDate, participants, amount, status, joinLink, feedback | Workshop, User |
| **reviews** | user→User, product→Product, workshop→Workshop, artisan→Artisan, rating, title, comment, isApproved, helpful | User, Product, Workshop, Artisan |
| **donations** | donor→User, amount, craftType, campaign, message, paymentId, isAnonymous | User |
| **certificates** | order→Order, product→Product, artisan→Artisan, buyer→User, certificateNumber (unique), qrCode, authenticityHash, isValid | Order, Product, Artisan, User |
| **gi_tags** | name (unique), type, description, location{state,district,region}, products[], artisans[]→Artisan, history, technique, images[] | Artisan |
| **craft_stories** | title, slug (unique), content, excerpt, coverImage, category (6 enums), craftType, region, featured, author→User | User |

### Indexes
- **Text indexes:** products(name+description+craftType), workshops(title+description+craftType), gi_tags(name+description)
- **Geospatial:** artisans.location (2dsphere)
- **Compound:** orders(user+createdAt, orderStatus), reviews(product+createdAt, artisan+rating), workshops(artisan), workshop_bookings(workshop+scheduleDate, user), craft_stories(slug unique, category+featured)

### Seed/Admin Data
- `scripts/seedAdmin.js` creates default admin: `admin@craftveda.com` / `Admin@123456`
- **Bug:** Uses `process.env.MONGODB_URI` but `.env` defines `MONGO_URI` — seed script will fail
- **Bug:** Imports `bcrypt` but never uses it (User model handles hashing)

### Relationships Diagram (simplified)
```
User ──1:1──> Artisan
User ──1:N──> Orders
User ──1:N──> Reviews
User ──1:N──> Donations
User ──1:1──> ArtisanApplication
Artisan ──1:N──> Products
Artisan ──1:N──> Workshops
Artisan ──N:M──> GITags
Product ──N:M──> GITags
Order ──1:1──> Certificate
Workshop ──1:N──> WorkshopBooking
```

---

## 6. Features Checklist

| Feature | Status | Notes |
|---|---|---|
| User Registration/Login | ✅ | Email+password, JWT |
| Role-based Auth (Customer/Artisan/Admin) | ✅ | 3 roles, middleware guards |
| Product Listing + Filtering | ✅ | Category, price, craftType, search, sort, pagination |
| Product Detail | ✅ | With artisan story, GI tag info |
| Artisan Directory | ✅ | City/state/craft filters |
| Artisan Profile | ✅ | Story, products, awards |
| Become Artisan Application | ✅ | Full form with approval workflow |
| Admin Approve/Reject Artisan | ✅ | Changes user role, creates Artisan |
| Workshop Listing | ✅ | Filterable by craftType, level, location |
| Workshop Booking | ✅ | Capacity check, participant tracking |
| Shopping Cart | ✅ | Quantity controls, order summary |
| Wishlist | ✅ | Move to cart, remove |
| Checkout | ✅ | Address, payment method selection |
| Order Creation | ✅ | Auto-calculates shipping + 18% GST |
| Order History | ✅ | Status badges, pagination |
| Order Cancellation | ✅ | With status validation |
| Reviews (Product/Artisan/Workshop) | ✅ | Rating, helpful count |
| Donations | ✅ | Preset/custom, craft type, anonymous option |
| GI Tag Directory | ✅ | Searchable, state-filtered |
| Certificate Generation | ✅ | QR code via qrcode library |
| Certificate Verification | ✅ | Public endpoint |
| Craft Stories (Blog) | ✅ | CRUD, categories, slug-based |
| Admin Dashboard | ✅ | Stats, user management |
| Customer Dashboard | ✅ | Orders, application status |
| Artisan Dashboard | ✅ | Products, workshops, metrics |
| Auth Context (Global State) | ✅ | Login, register, logout, profile |
| API Interceptors (Token + 401) | ✅ | Auto-attach, auto-redirect |
| Error Handling (Backend) | ✅ | ApiError, catchAsync, errorHandler |
| Rate Limiting | ✅ | 100 req/15min on /api/ |
| Security Headers | ✅ | Helmet |
| Payment Integration | ❌ | Stub only — returns mock data |
| Cloudinary Image Upload | ❌ | Library installed but not wired |
| Multer File Upload | ❌ | Library installed but not wired |
| Email (Nodemailer) | ❌ | Library installed but not wired |
| Password Reset Flow | ❌ | Schema fields exist, no route/logic |
| Google OAuth | ❌ | Button exists in Auth page, no backend |
| Cart Backend Persistence | ❌ | User.cart[] schema exists, no routes |
| Wishlist Backend Persistence | ❌ | User.wishlist[] schema exists, no routes |
| Search (Backend full-text) | ⚠️ | Text indexes exist, routes accept `search` param, but no dedicated search endpoint |
| Admin Product Management UI | ⚠️ | Admin page exists but no product CRUD UI |
| Admin Order Management | ❌ | No admin order routes or UI |
| Seed Data (Products/Artisans) | ❌ | Only admin seed exists |
| Responsive Design | ⚠️ | Tailwind classes used, but not all pages verified for mobile |

---

## 7. Known Errors/Warnings

### Confirmed Bugs
1. **`seedAdmin.js` uses wrong env var:** `process.env.MONGODB_URI` but `.env` has `MONGO_URI` — seed script will fail to connect
2. **`seedAdmin.js` unused import:** `import bcrypt from 'bcryptjs'` — never used (harmless but messy)
3. **`.env` JWT_SECRET is placeholder:** `your-super-secret-jwt-key-change-in-production`

### Potential Issues
4. **No input validation on most routes** — only auth routes use express-validator; all other routes accept raw body → potential for invalid data/Mongo errors
5. **Workshop booking route ordering:** `GET /my-bookings` may conflict with `GET /:id` since Express matches in order — `/my-bookings` must be defined BEFORE `/:id` (currently it's defined AFTER — **will never be reached**)
6. **`/workshops/my-bookings` defined after `/:id`** — `my-bookings` will be treated as an `:id` parameter
7. **No error handling on frontend service calls** — pages likely have try/catch but errors may silently fail
8. **Cloudinary/Multer not configured** — product creation accepts `images[]` as array but no actual file upload
9. **Payment routes are stubs** — orders can be created but payment never actually processed
10. **No HTTPS/CORS origin restrictions** — CORS is wide open (`cors()` with no config)

### Build/Runtime (Not Verified — no run attempted)
- Tailwind v4 + PostCSS configured correctly for Vite
- No TypeScript — runtime errors caught only by linter (Oxlint)
- No test framework installed

---

## 8. Most Recent Changes (Inferred from Code)
- Full project scaffolding complete (all 12 models, 13 routes, 18 pages)
- Tailwind v4 migration (using `@theme` directive, `@tailwindcss/postcss`)
- React 19 + React Router v7 + Vite 8
- Artisan application approval workflow (full create/approve/reject flow)
- Workshop booking system
- Certificate generation with QR codes
- Donation system with stats aggregation

---

## 9. What Currently Works (If Run)
Assuming MongoDB is running locally on port 27017:
- ✅ Backend starts on port 5000
- ✅ All API routes respond correctly
- ✅ User registration + login + JWT auth
- ✅ Product CRUD (admin creates, public reads)
- ✅ Artisan listing + profiles
- ✅ Workshop listing + booking
- ✅ Order creation + listing + cancellation
- ✅ Reviews, donations, GI tags, craft stories — all CRUD
- ✅ Certificate generation + verification
- ✅ Admin dashboard stats + user management
- ✅ Frontend renders on port 3000 with proxy to backend
- ✅ All 18 pages render with full UI

**What WON'T work without fixes:**
- `npm run seed-admin` — wrong env var name
- Workshop `my-bookings` — route shadowed by `/:id`
- File uploads (Cloudinary/Multer not wired)
- Payments (stubs)
- Password reset (no route)
- Google OAuth (no backend)

---

## 10. What's Missing for Completion

### Critical (Must Fix)
1. Fix `seedAdmin.js` env var (`MONGODB_URI` → `MONGO_URI`)
2. Fix workshop routes ordering (`/my-bookings` before `/:id`)
3. Add input validation to all routes (express-validator)
4. Wire up Cloudinary + Multer for image uploads
5. Implement payment gateway (Razorpay/Stripe)
6. Add CORS origin configuration for production
7. Change JWT_SECRET for production

### Important
8. Password reset flow (email + token)
9. Cart backend persistence (save/load cart)
10. Wishlist backend persistence
11. Admin order management (list, update status)
12. Admin product management UI
13. Seed data script (sample products, artisans, workshops)
14. Email notifications (order confirmation, application status)
15. Google OAuth integration

### Nice to Have
16. Image upload UI component
17. Rich text editor for craft stories
18. Workshop video integration
19. Real-time order tracking
20. Analytics/reporting for admin
21. Test suite (unit + integration)
22. TypeScript migration
23. Production deployment config (Docker, env vars)
24. Rate limiting per-user (currently global)

---

## 11. Recommended Next Steps (Priority Order)

1. **Fix bugs:** `seedAdmin.js` env var, workshop route ordering, unused bcrypt import
2. **Add validation:** express-validator to products, orders, workshops, artisan-applications routes
3. **Wire Cloudinary + Multer:** Product image upload (backend + frontend)
4. **Implement payments:** Razorpay/Stripe SDK integration
5. **Add password reset:** Token-based flow with Nodemailer
6. **Cart/Wishlist persistence:** Backend routes for User.cart and User.wishlist
7. **Admin order management:** Routes + UI for order status updates
8. **Seed data:** Script to populate sample products, artisans, workshops, GI tags
9. **Security hardening:** CORS origins, rate limit per-user, helmet CSP config
10. **CORS + production env:** `.env.production`, allowed origins, HTTPS
