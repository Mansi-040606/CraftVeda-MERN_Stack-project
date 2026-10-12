// Step 4 E2E — reviews API against a throwaway database.
// Run from backend/: node tests/step4-reviews.e2e.mjs
// NEVER touches craftveda / craftveda_dev — hard-guarded below.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DB = 'craftveda_step4_test';
const MONGO_URI = `mongodb://localhost:27017/${TEST_DB}`;
const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}/api`;
const TEST_TIMEOUT_MS = 60_000;

if (!MONGO_URI.endsWith(`/${TEST_DB}`)) {
  console.error('FATAL: refusing to run — unexpected DB');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

let serverProc = null;
const serverLogs = [];

const results = [];
let pass = 0;
let fail = 0;

async function check(name, fn) {
  try {
    await fn();
    results.push(`  PASS  ${name}`);
    pass += 1;
  } catch (err) {
    results.push(`  FAIL  ${name} — ${err.message}`);
    fail += 1;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function req(method, urlPath, { token, body } = {}) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

function assertPortFree() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', (err) => {
      reject(err.code === 'EADDRINUSE'
        ? new Error(`Port ${PORT} is already in use — free it first`)
        : err);
    });
    srv.once('listening', () => srv.close(() => resolve()));
    srv.listen(PORT, '127.0.0.1');
  });
}

async function dropTestDb() {
  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  if (conn.name !== TEST_DB) {
    await conn.close();
    throw new Error(`Refusing to drop unexpected database: ${conn.name}`);
  }
  await conn.dropDatabase();
  await conn.close();
}

function startServer() {
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      MONGO_URI,
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', (d) => serverLogs.push(d.toString()));
  proc.stderr.on('data', (d) => serverLogs.push(d.toString()));
  return proc;
}

async function waitForHealth(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server did not become healthy in time');
}

function stopServer() {
  if (!serverProc || serverProc.exitCode !== null) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${serverProc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      serverProc.kill('SIGKILL');
    }
  } catch { /* already dead */ }
}

async function cleanup() {
  stopServer();
  // Give the OS a moment to release the port before anything else runs.
  await new Promise((r) => setTimeout(r, 400));
  try {
    const conn = await mongoose.createConnection(MONGO_URI).asPromise();
    if (conn.name === TEST_DB) await conn.dropDatabase();
    await conn.close();
    console.log(`\nCleanup: server stopped, database '${TEST_DB}' dropped.`);
  } catch (err) {
    console.error(`\nCleanup error: ${err.message}`);
  }
}

// ---------- seed (directly into the throwaway DB) ----------
async function seed() {
  const { default: User } = await import('../src/models/User.js');
  const { default: Artisan } = await import('../src/models/Artisan.js');
  const { default: Product } = await import('../src/models/Product.js');
  const { default: Order } = await import('../src/models/Order.js');

  const [artisanUser, buyerDelivered, buyerPending, buyerNone, buyerSecond, adminUser] =
    await User.create([
      { name: 'E2E Artisan', email: 'artisan-owner@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
      { name: 'E2E Buyer One', email: 'buyer-one@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
      { name: 'E2E Buyer Pending', email: 'buyer-pending@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
      { name: 'E2E Buyer None', email: 'buyer-none@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
      { name: 'E2E Buyer Two', email: 'buyer-two@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
      { name: 'E2E Admin', email: 'admin@e2e.test', password: 'Test@1234', role: 'ADMIN' }
    ]);

  const artisan = await Artisan.create({
    user: artisanUser._id,
    businessName: 'E2E Weaves',
    description: 'Test weaver profile',
    craftTypes: ['textiles'],
    isVerified: true
  });

  const [p1, p2] = await Product.create([
    {
      name: 'E2E Handloom Saree', description: 'A test saree', price: 500,
      category: 'textiles', craftType: 'Handloom', stock: 10, artisan: artisan._id
    },
    {
      name: 'E2E Cotton Dupatta', description: 'A test dupatta', price: 300,
      category: 'textiles', craftType: 'Handloom', stock: 10, artisan: artisan._id
    }
  ]);

  const addr = { street: '1 Test Lane', city: 'Testville', state: 'Rajasthan', pincode: '123456' };
  await Order.create([
    {
      user: buyerDelivered._id,
      items: [
        { product: p1._id, quantity: 1, price: p1.price },
        { product: p2._id, quantity: 1, price: p2.price }
      ],
      shippingAddress: addr, subtotal: 800, total: 800, orderStatus: 'delivered'
    },
    {
      user: buyerPending._id,
      items: [{ product: p1._id, quantity: 1, price: p1.price }],
      shippingAddress: addr, subtotal: 500, total: 500, orderStatus: 'pending'
    },
    {
      user: buyerSecond._id,
      items: [{ product: p1._id, quantity: 1, price: p1.price }],
      shippingAddress: addr, subtotal: 500, total: 500, orderStatus: 'delivered'
    }
  ]);

  return {
    ids: {
      artisan: artisan._id.toString(),
      p1: p1._id.toString(),
      p2: p2._id.toString()
    },
    creds: {
      artisan: { email: 'artisan-owner@e2e.test', password: 'Test@1234' },
      buyerDelivered: { email: 'buyer-one@e2e.test', password: 'Test@1234' },
      buyerPending: { email: 'buyer-pending@e2e.test', password: 'Test@1234' },
      buyerNone: { email: 'buyer-none@e2e.test', password: 'Test@1234' },
      buyerSecond: { email: 'buyer-two@e2e.test', password: 'Test@1234' },
      admin: { email: 'admin@e2e.test', password: 'Test@1234' }
    }
  };
}

async function login(creds) {
  const { status, json } = await req('POST', '/auth/login', { body: creds });
  assert(status === 200 && json?.token, `login failed (${status})`);
  return json.token;
}

// ---------- the tests ----------
async function runTests(seedData) {
  const { ids, creds } = seedData;
  const tBuyer1 = await login(creds.buyerDelivered);
  const tPending = await login(creds.buyerPending);
  const tNone = await login(creds.buyerNone);
  const tBuyer2 = await login(creds.buyerSecond);
  const tArtisan = await login(creds.artisan);
  const tAdmin = await login(creds.admin);

  let review1Id = null;
  let review2Id = null;

  await check('health endpoint responds', async () => {
    const { status, json } = await req('GET', '/health');
    assert(status === 200 && json.status === 'ok', `got ${status}`);
  });

  await check('POST review without token -> 401', async () => {
    const { status } = await req('POST', '/reviews', {
      body: { product: ids.p1, rating: 5, comment: 'Great product' }
    });
    assert(status === 401, `got ${status}`);
  });

  await check('rating below 1 rejected -> 400', async () => {
    const { status, json } = await req('POST', '/reviews', {
      token: tBuyer1, body: { product: ids.p1, rating: 0, comment: 'Great product' }
    });
    assert(status === 400, `got ${status}`);
    assert(json?.message === 'Validation failed', `got ${json?.message}`);
  });

  await check('rating above 5 rejected -> 400', async () => {
    const { status } = await req('POST', '/reviews', {
      token: tBuyer1, body: { product: ids.p1, rating: 6, comment: 'Great product' }
    });
    assert(status === 400, `got ${status}`);
  });

  await check('missing comment rejected -> 400', async () => {
    const { status } = await req('POST', '/reviews', {
      token: tBuyer1, body: { product: ids.p1, rating: 4 }
    });
    assert(status === 400, `got ${status}`);
  });

  await check('client-sent artisan field rejected -> 400', async () => {
    const { status } = await req('POST', '/reviews', {
      token: tBuyer1,
      body: { product: ids.p1, rating: 4, comment: 'Great product', artisan: ids.artisan }
    });
    assert(status === 400, `got ${status}`);
  });

  await check('client-sent workshop field rejected -> 400', async () => {
    const { status } = await req('POST', '/reviews', {
      token: tBuyer1,
      body: { product: ids.p1, rating: 4, comment: 'Great product', workshop: ids.p1 }
    });
    assert(status === 400, `got ${status}`);
  });

  await check('malformed product id -> 400', async () => {
    const { status } = await req('POST', '/reviews', {
      token: tBuyer1, body: { product: 'not-an-id', rating: 4, comment: 'Great product' }
    });
    assert(status === 400, `got ${status}`);
  });

  await check('nonexistent product -> 404', async () => {
    const { status } = await req('POST', '/reviews', {
      token: tBuyer1,
      body: { product: '000000000000000000000000', rating: 4, comment: 'Great product' }
    });
    assert(status === 404, `got ${status}`);
  });

  await check('no purchase at all -> 403', async () => {
    const { status, json } = await req('POST', '/reviews', {
      token: tNone, body: { product: ids.p1, rating: 5, comment: 'Never bought this' }
    });
    assert(status === 403, `got ${status}`);
    assert(/delivered/i.test(json?.message || ''), `got: ${json?.message}`);
  });

  await check('order not yet delivered -> 403', async () => {
    const { status, json } = await req('POST', '/reviews', {
      token: tPending, body: { product: ids.p1, rating: 5, comment: 'Still waiting' }
    });
    assert(status === 403, `got ${status}`);
    assert(/delivered/i.test(json?.message || ''), `got: ${json?.message}`);
  });

  await check('own-product rule (artisan reviews self) -> 403', async () => {
    const { status, json } = await req('POST', '/reviews', {
      token: tArtisan, body: { product: ids.p1, rating: 5, comment: 'My own product' }
    });
    assert(status === 403, `got ${status}`);
    assert(/own product/i.test(json?.message || ''), `got: ${json?.message}`);
  });

  await check('delivered buyer can post review -> 201', async () => {
    const { status, json } = await req('POST', '/reviews', {
      token: tBuyer1,
      body: { product: ids.p1, rating: 5, title: 'Lovely', comment: 'Beautiful weave, very happy' }
    });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
    assert(json?.review?.isVerifiedPurchase === true, 'not marked verified purchase');
    assert(json?.review?.artisan === ids.artisan, 'artisan not derived from product');
    review1Id = json.review._id;
  });

  await check('Product.averageRating/reviewCount synced after create', async () => {
    const { status, json } = await req('GET', `/products/${ids.p1}`);
    assert(status === 200, `got ${status}`);
    assert(json.product.averageRating === 5, `averageRating=${json.product.averageRating}`);
    assert(json.product.reviewCount === 1, `reviewCount=${json.product.reviewCount}`);
  });

  await check('Artisan.rating/reviewCount synced after create', async () => {
    const { status, json } = await req('GET', `/artisans/${ids.artisan}`);
    assert(status === 200, `got ${status}`);
    assert(json.artisan.rating === 5, `rating=${json.artisan.rating}`);
    assert(json.artisan.reviewCount === 1, `reviewCount=${json.artisan.reviewCount}`);
  });

  await check('duplicate review by same user -> 409', async () => {
    const { status } = await req('POST', '/reviews', {
      token: tBuyer1,
      body: { product: ids.p1, rating: 4, comment: 'Trying to review twice' }
    });
    assert(status === 409, `got ${status}`);
  });

  await check('GET product reviews (public) returns approved only', async () => {
    const { status, json } = await req('GET', `/reviews/product/${ids.p1}`);
    assert(status === 200, `got ${status}`);
    assert(json.total === 1, `total=${json.total}`);
    assert(json.averageRating === 5, `averageRating=${json.averageRating}`);
  });

  await check('can-review: already reviewed -> allowed:false', async () => {
    const { status, json } = await req('GET', `/reviews/product/${ids.p1}/can-review`, {
      token: tBuyer1
    });
    assert(status === 200, `got ${status}`);
    assert(json.allowed === false && json.alreadyReviewed === true, JSON.stringify(json));
  });

  await check('can-review: delivered but not reviewed -> allowed:true', async () => {
    const { status, json } = await req('GET', `/reviews/product/${ids.p2}/can-review`, {
      token: tBuyer1
    });
    assert(status === 200, `got ${status}`);
    assert(json.allowed === true, JSON.stringify(json));
  });

  await check('can-review: requires login -> 401', async () => {
    const { status } = await req('GET', `/reviews/product/${ids.p1}/can-review`);
    assert(status === 401, `got ${status}`);
  });

  await check('second delivered buyer reviews -> aggregates average', async () => {
    const { status, json } = await req('POST', '/reviews', {
      token: tBuyer2,
      body: { product: ids.p1, rating: 3, comment: 'Decent but shipping was slow' }
    });
    assert(status === 201, `got ${status}`);
    review2Id = json.review._id;

    const prod = await req('GET', `/products/${ids.p1}`);
    assert(prod.json.product.averageRating === 4, `averageRating=${prod.json.product.averageRating}`);
    assert(prod.json.product.reviewCount === 2, `reviewCount=${prod.json.product.reviewCount}`);

    const art = await req('GET', `/artisans/${ids.artisan}`);
    assert(art.json.artisan.rating === 4, `artisan rating=${art.json.artisan.rating}`);
    assert(art.json.artisan.reviewCount === 2, `artisan reviewCount=${art.json.artisan.reviewCount}`);
  });

  await check('admin moderation: hide review -> aggregates recalculated', async () => {
    const { status } = await req('PATCH', `/reviews/${review1Id}`, {
      token: tAdmin, body: { isApproved: false }
    });
    assert(status === 200, `got ${status}`);

    const prod = await req('GET', `/products/${ids.p1}`);
    assert(prod.json.product.averageRating === 3, `averageRating=${prod.json.product.averageRating}`);
    assert(prod.json.product.reviewCount === 1, `reviewCount=${prod.json.product.reviewCount}`);

    const art = await req('GET', `/artisans/${ids.artisan}`);
    assert(art.json.artisan.rating === 3, `artisan rating=${art.json.artisan.rating}`);
    assert(art.json.artisan.reviewCount === 1, `artisan reviewCount=${art.json.artisan.reviewCount}`);

    const pub = await req('GET', `/reviews/product/${ids.p1}`);
    assert(pub.json.total === 1, `public total=${pub.json.total}`);
  });

  await check('admin moderation: re-approve -> aggregates restored', async () => {
    const { status } = await req('PATCH', `/reviews/${review1Id}`, {
      token: tAdmin, body: { isApproved: true }
    });
    assert(status === 200, `got ${status}`);

    const prod = await req('GET', `/products/${ids.p1}`);
    assert(prod.json.product.averageRating === 4, `averageRating=${prod.json.product.averageRating}`);
    assert(prod.json.product.reviewCount === 2, `reviewCount=${prod.json.product.reviewCount}`);

    const art = await req('GET', `/artisans/${ids.artisan}`);
    assert(art.json.artisan.rating === 4, `artisan rating=${art.json.artisan.rating}`);
    assert(art.json.artisan.reviewCount === 2, `artisan reviewCount=${art.json.artisan.reviewCount}`);
  });

  await check('moderation validator: missing isApproved -> 400', async () => {
    const { status } = await req('PATCH', `/reviews/${review1Id}`, {
      token: tAdmin, body: {}
    });
    assert(status === 400, `got ${status}`);
  });

  await check('moderation is admin-only -> 403 for customer', async () => {
    const { status } = await req('PATCH', `/reviews/${review1Id}`, {
      token: tBuyer1, body: { isApproved: false }
    });
    assert(status === 403, `got ${status}`);
  });

  await check('GET artisan reviews (public)', async () => {
    const { status, json } = await req('GET', `/reviews/artisan/${ids.artisan}`);
    assert(status === 200, `got ${status}`);
    assert(json.total === 2, `total=${json.total}`);
    assert(json.averageRating === 4, `averageRating=${json.averageRating}`);
  });

  await check('helpful vote counts unique voters ($addToSet)', async () => {
    const first = await req('PUT', `/reviews/${review1Id}/helpful`, { token: tBuyer2 });
    assert(first.status === 200, `first vote got ${first.status}`);
    assert(first.json.review.helpful === 1, `helpful=${first.json.review.helpful}`);

    const again = await req('PUT', `/reviews/${review1Id}/helpful`, { token: tBuyer2 });
    assert(again.status === 200, `repeat vote got ${again.status}`);
    assert(again.json.review.helpful === 1, `helpful after repeat=${again.json.review.helpful}`);
  });

  await check('admin review list -> 200, customer list -> 403', async () => {
    const adminList = await req('GET', '/reviews', { token: tAdmin });
    assert(adminList.status === 200, `admin got ${adminList.status}`);
    assert(adminList.json.total === 2, `total=${adminList.json.total}`);

    const customerList = await req('GET', '/reviews', { token: tBuyer1 });
    assert(customerList.status === 403, `customer got ${customerList.status}`);
  });
}

// ---------- main ----------
async function main() {
  console.log(`Step 4 reviews E2E — db=${TEST_DB}, port=${PORT}, timeout=${TEST_TIMEOUT_MS / 1000}s`);

  await assertPortFree();
  console.log(`Port ${PORT} is free.`);

  await dropTestDb();
  console.log(`Fresh database '${TEST_DB}' ready.`);

  serverProc = startServer();
  await waitForHealth();
  console.log('Test server is healthy.');

  await mongoose.connect(MONGO_URI);
  const seedData = await seed();
  console.log('Seed data created.');

  await Promise.race([
    runTests(seedData),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tests timed out after ${TEST_TIMEOUT_MS / 1000}s`)), TEST_TIMEOUT_MS)
    )
  ]);
}

main()
  .then(() => {
    console.log(`\n${results.join('\n')}`);
    console.log(`\n${pass + fail}/${pass + fail} tests passed${fail ? ` (${fail} FAILED)` : ''}`);
    process.exitCode = fail ? 1 : 0;
  })
  .catch((err) => {
    console.log(`\n${results.join('\n')}`);
    console.error(`\nRun aborted: ${err.message}`);
    if (serverLogs.length) {
      console.error('\n--- server output (tail) ---');
      console.error(serverLogs.join('').split('\n').slice(-15).join('\n'));
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await mongoose.disconnect(); } catch { /* already down */ }
    await cleanup();
    process.exit(process.exitCode ?? 0);
  });
