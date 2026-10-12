// Step 5 E2E — artisan dashboard stats + artisan orders, on a throwaway database.
// Run from backend/: node tests/step5-artisan.e2e.mjs
// NEVER touches craftveda / craftveda_dev — hard-guarded below.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DB = 'craftveda_step5_test';
const MONGO_URI = `mongodb://localhost:27017/${TEST_DB}`;
const PORT = 5098;
const BASE = `http://127.0.0.1:${PORT}/api`;
const TEST_TIMEOUT_MS = 60_000;

const FORBIDDEN_DBS = ['craftveda', 'craftveda_dev'];
if (!MONGO_URI.endsWith(`/${TEST_DB}`) || FORBIDDEN_DBS.includes(TEST_DB)) {
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
// artisan1 owns P1/P2/P3, artisan2 owns P4.
//   O1 (delivered) P1x2 + P4x1      -> artisan1 sees only P1x2
//   O2 (pending)   P1x1
//   O3 (cancelled) P1x3             -> counted in totalOrders, NOT in revenue/itemsSold
//   O4 (processing) P2x1
//   O5 (delivered) P4x1             -> artisan2 only
async function seed() {
  const { default: User } = await import('../src/models/User.js');
  const { default: Artisan } = await import('../src/models/Artisan.js');
  const { default: Product } = await import('../src/models/Product.js');
  const { default: Order } = await import('../src/models/Order.js');

  const [artisan1User, artisan2User, noProfileUser, buyer1, buyer2, adminUser] = await User.create([
    { name: 'E2E Artisan One', email: 'artisan1@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Artisan Two', email: 'artisan2@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Artisan No Profile', email: 'artisan-noprofile@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Buyer One', email: 'buyer-one@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Buyer Two', email: 'buyer-two@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Admin', email: 'admin@e2e.test', password: 'Test@1234', role: 'ADMIN' }
  ]);

  const [a1, a2] = await Artisan.create([
    {
      user: artisan1User._id, businessName: 'E2E Weaves', description: 'Test weaver',
      craftTypes: ['textiles'], isVerified: true, rating: 0, reviewCount: 0
    },
    {
      user: artisan2User._id, businessName: 'E2E Pottery', description: 'Test potter',
      craftTypes: ['pottery'], isVerified: false
    }
  ]);

  const [p1, p2, p3, p4] = await Product.create([
    { name: 'E2E Handloom Saree', description: 'A test saree', price: 500, category: 'textiles', craftType: 'Handloom', stock: 10, artisan: a1._id },
    { name: 'E2E Cotton Dupatta', description: 'A test dupatta', price: 300, category: 'textiles', craftType: 'Handloom', stock: 2, artisan: a1._id },
    { name: 'E2E Wool Scarf', description: 'A test scarf', price: 200, category: 'textiles', craftType: 'Handloom', stock: 0, isActive: false, artisan: a1._id },
    { name: 'E2E Clay Pot', description: 'A test pot', price: 999, category: 'pottery', craftType: 'Terracotta', stock: 5, artisan: a2._id }
  ]);

  const addr = { street: '1 Test Lane', city: 'Testville', state: 'Rajasthan', pincode: '123456' };
  const orders = await Order.create([
    {
      user: buyer1._id,
      items: [
        { product: p1._id, quantity: 2, price: p1.price },
        { product: p4._id, quantity: 1, price: p4.price }
      ],
      shippingAddress: addr, subtotal: 1999, total: 1999, orderStatus: 'delivered'
    },
    {
      user: buyer2._id,
      items: [{ product: p1._id, quantity: 1, price: p1.price }],
      shippingAddress: addr, subtotal: 500, total: 500, orderStatus: 'pending'
    },
    {
      user: buyer1._id,
      items: [{ product: p1._id, quantity: 3, price: p1.price }],
      shippingAddress: addr, subtotal: 1500, total: 1500, orderStatus: 'cancelled'
    },
    {
      user: buyer2._id,
      items: [{ product: p2._id, quantity: 1, price: p2.price }],
      shippingAddress: addr, subtotal: 300, total: 300, orderStatus: 'processing'
    },
    {
      user: buyer1._id,
      items: [{ product: p4._id, quantity: 1, price: p4.price }],
      shippingAddress: addr, subtotal: 999, total: 999, orderStatus: 'delivered'
    }
  ]);

  return {
    ids: {
      a1: a1._id.toString(),
      p1: p1._id.toString(),
      p2: p2._id.toString(),
      p3: p3._id.toString(),
      p4: p4._id.toString(),
      o1: orders[0]._id.toString(),
      o3: orders[2]._id.toString()
    },
    creds: {
      artisan1: { email: 'artisan1@e2e.test', password: 'Test@1234' },
      artisan2: { email: 'artisan2@e2e.test', password: 'Test@1234' },
      artisanNoProfile: { email: 'artisan-noprofile@e2e.test', password: 'Test@1234' },
      buyer1: { email: 'buyer-one@e2e.test', password: 'Test@1234' },
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
  const tArtisan1 = await login(creds.artisan1);
  const tArtisan2 = await login(creds.artisan2);
  const tNoProfile = await login(creds.artisanNoProfile);
  const tBuyer = await login(creds.buyer1);
  const tAdmin = await login(creds.admin);

  await check('health endpoint responds', async () => {
    const { status, json } = await req('GET', '/health');
    assert(status === 200 && json.status === 'ok', `got ${status}`);
  });

  // ---- GET /artisans/me/stats ----
  await check('stats without token -> 401', async () => {
    const { status } = await req('GET', '/artisans/me/stats');
    assert(status === 401, `got ${status}`);
  });

  await check('stats as CUSTOMER -> 403', async () => {
    const { status } = await req('GET', '/artisans/me/stats', { token: tBuyer });
    assert(status === 403, `got ${status}`);
  });

  await check('stats as ARTISAN without profile -> 403', async () => {
    const { status, json } = await req('GET', '/artisans/me/stats', { token: tNoProfile });
    assert(status === 403, `got ${status}`);
    assert(/artisan profile/i.test(json?.message || ''), `got: ${json?.message}`);
  });

  await check('stats as ADMIN -> 403', async () => {
    const { status } = await req('GET', '/artisans/me/stats', { token: tAdmin });
    assert(status === 403, `got ${status}`);
  });

  await check('stats: product / order / sales numbers', async () => {
    const { status, json } = await req('GET', '/artisans/me/stats', { token: tArtisan1 });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    const s = json.stats;
    assert(s.totalProducts === 3, `totalProducts=${s.totalProducts}`);
    assert(s.activeProducts === 2, `activeProducts=${s.activeProducts}`);
    assert(s.inactiveProducts === 1, `inactiveProducts=${s.inactiveProducts}`);
    assert(s.lowStockProducts === 2, `lowStockProducts=${s.lowStockProducts}`);
    assert(s.totalOrders === 4, `totalOrders=${s.totalOrders}`);
    assert(s.itemsSold === 4, `itemsSold=${s.itemsSold}`);
    assert(s.revenue === 1800, `revenue=${s.revenue}`);
    assert(s.averageRating === 0, `averageRating=${s.averageRating}`);
    assert(s.reviewCount === 0, `reviewCount=${s.reviewCount}`);
    assert(s.isVerified === true, `isVerified=${s.isVerified}`);
  });

  await check('stats: recent orders keep only my items', async () => {
    const { json } = await req('GET', '/artisans/me/stats', { token: tArtisan1 });
    const recent = json.stats.recentOrders;
    assert(Array.isArray(recent) && recent.length === 4, `recent length=${recent?.length}`);
    const mine = new Set([ids.p1, ids.p2, ids.p3]);
    for (const order of recent) {
      assert(order.items.length > 0, 'an order has no owned items');
      for (const item of order.items) {
        assert(mine.has(String(item.product?._id)), `foreign product ${item.product?._id} leaked`);
      }
      assert(typeof order.orderStatus === 'string', 'missing orderStatus');
      assert(order.customer?.name, 'customer not populated');
    }
    const mixed = recent.find((o) => String(o._id) === ids.o1);
    assert(mixed, 'O1 missing from recent orders');
    assert(mixed.items.length === 1, `O1 should show 1 owned item, got ${mixed.items.length}`);
    assert(mixed.itemsTotal === 1000, `O1 itemsTotal=${mixed.itemsTotal}`);
  });

  await check('stats: top 3 selling products', async () => {
    const { json } = await req('GET', '/artisans/me/stats', { token: tArtisan1 });
    const top = json.stats.topSelling;
    assert(top.length === 2, `topSelling length=${top.length}`);
    assert(String(top[0].product._id) === ids.p1, `first=${top[0].product._id}`);
    assert(top[0].quantity === 3, `p1 qty=${top[0].quantity}`);
    assert(top[0].revenue === 1500, `p1 revenue=${top[0].revenue}`);
    assert(String(top[1].product._id) === ids.p2, `second=${top[1].product._id}`);
    assert(top[1].quantity === 1, `p2 qty=${top[1].quantity}`);
  });

  await check('stats: second artisan is scoped to own products', async () => {
    const { json } = await req('GET', '/artisans/me/stats', { token: tArtisan2 });
    const s = json.stats;
    assert(s.totalProducts === 1, `totalProducts=${s.totalProducts}`);
    assert(s.totalOrders === 2, `totalOrders=${s.totalOrders}`);
    assert(s.itemsSold === 2, `itemsSold=${s.itemsSold}`);
    assert(s.revenue === 1998, `revenue=${s.revenue}`);
  });

  // ---- GET /products/mine (artisan product management) ----
  await check('my products: own list includes inactive', async () => {
    const { status, json } = await req('GET', '/products/mine', { token: tArtisan1 });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.total === 3, `total=${json.total}`);
    assert(json.products.some((p) => String(p._id) === ids.p3 && p.isActive === false), 'inactive product missing');
  });

  await check('my products: customer -> 403, admin -> 403', async () => {
    const cust = await req('GET', '/products/mine', { token: tBuyer });
    assert(cust.status === 403, `customer got ${cust.status}`);
    const adm = await req('GET', '/products/mine', { token: tAdmin });
    assert(adm.status === 403, `admin got ${adm.status}`);
  });

  await check('my products: search filter works', async () => {
    const { json } = await req('GET', '/products/mine?search=Dupatta', { token: tArtisan1 });
    assert(json.total === 1, `total=${json.total}`);
    assert(String(json.products[0]._id) === ids.p2, `got ${json.products[0]._id}`);
  });

  await check('public product list still hides inactive products', async () => {
    const { status, json } = await req('GET', '/products');
    assert(status === 200, `got ${status}`);
    assert(!json.products.some((p) => String(p._id) === ids.p3), 'inactive product leaked');
  });

  // ---- GET /artisans/me/orders ----
  await check('my orders without token -> 401', async () => {
    const { status } = await req('GET', '/artisans/me/orders');
    assert(status === 401, `got ${status}`);
  });

  await check('my orders as CUSTOMER -> 403', async () => {
    const { status } = await req('GET', '/artisans/me/orders', { token: tBuyer });
    assert(status === 403, `got ${status}`);
  });

  await check('my orders: pagination + ownership scoping', async () => {
    const { status, json } = await req('GET', '/artisans/me/orders?page=1&limit=2', { token: tArtisan1 });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.total === 4, `total=${json.total}`);
    assert(json.pages === 2, `pages=${json.pages}`);
    assert(json.page === 1, `page=${json.page}`);
    assert(json.orders.length === 2, `orders length=${json.orders.length}`);

    const mine = new Set([ids.p1, ids.p2, ids.p3]);
    for (const order of json.orders) {
      for (const item of order.items) {
        assert(mine.has(String(item.product?._id)), `foreign product leaked in ${order._id}`);
      }
      assert(order.orderStatus, 'missing orderStatus');
    }
  });

  await check('my orders: page 2 returns the rest', async () => {
    const { json } = await req('GET', '/artisans/me/orders?page=2&limit=2', { token: tArtisan1 });
    assert(json.orders.length === 2, `orders length=${json.orders.length}`);
    assert(json.page === 2, `page=${json.page}`);
  });

  await check('my orders: status filter (cancelled -> 1)', async () => {
    const { json } = await req('GET', '/artisans/me/orders?orderStatus=cancelled', { token: tArtisan1 });
    assert(json.total === 1, `total=${json.total}`);
    assert(json.orders[0]._id === ids.o3, `got ${json.orders[0]._id}`);
  });

  await check('my orders: validation rejects bad page/status -> 400', async () => {
    const bad1 = await req('GET', '/artisans/me/orders?page=0', { token: tArtisan1 });
    assert(bad1.status === 400, `page=0 got ${bad1.status}`);
    const bad2 = await req('GET', '/artisans/me/orders?orderStatus=weird', { token: tArtisan1 });
    assert(bad2.status === 400, `bad status got ${bad2.status}`);
    const bad3 = await req('GET', '/artisans/me/orders?limit=999', { token: tArtisan1 });
    assert(bad3.status === 400, `limit=999 got ${bad3.status}`);
  });

  await check('my orders: second artisan only sees own orders', async () => {
    const { json } = await req('GET', '/artisans/me/orders', { token: tArtisan2 });
    assert(json.total === 2, `total=${json.total}`);
    for (const order of json.orders) {
      for (const item of order.items) {
        assert(String(item.product?._id) === ids.p4, `unexpected product ${item.product?._id}`);
      }
    }
  });

  // ---- read-only: no artisan status endpoint exists (rules stay with admin/customer) ----
  await check('artisan order status update is NOT available -> 404', async () => {
    const put = await req('PUT', `/artisans/me/orders/${ids.o1}/status`, {
      token: tArtisan1, body: { orderStatus: 'shipped' }
    });
    assert(put.status === 404, `PUT status got ${put.status}`);

    const patch = await req('PATCH', `/artisans/me/orders/${ids.o1}`, {
      token: tArtisan1, body: { orderStatus: 'shipped' }
    });
    assert(patch.status === 404, `PATCH order got ${patch.status}`);
  });

  await check('customer order list still owner-scoped (artisan sees no own purchases)', async () => {
    const { status, json } = await req('GET', '/orders', { token: tArtisan1 });
    assert(status === 200, `got ${status}`);
    assert(json.total === 0, `total=${json.total}`);
  });
}

// ---------- main ----------
async function main() {
  console.log(`Step 5 artisan E2E — db=${TEST_DB}, port=${PORT}, timeout=${TEST_TIMEOUT_MS / 1000}s`);

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
