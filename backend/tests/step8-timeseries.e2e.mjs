// Step 8 E2E — admin dashboard time-series endpoint
// (GET /api/admin/stats/timeseries: auth, validation, zero-filled months,
//  revenue excludes cancelled, status/category/artisan aggregates).
// Run from backend/: node tests/step8-timeseries.e2e.mjs
// NEVER touches craftveda / craftveda_dev — hard-guarded below.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DB = 'craftveda_step8_test';
const MONGO_URI = `mongodb://localhost:27017/${TEST_DB}`;
const PORT = 5096;
const BASE = `http://127.0.0.1:${PORT}/api`;
const TEST_TIMEOUT_MS = 90_000;

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

// A date `monthsAgo` months back, mid-month (UTC) so it always lands inside
// the intended bucket regardless of the local timezone.
const monthDate = (monthsAgo, day) => {
  const now = new Date();
  const safeDay = monthsAgo === 0 ? Math.min(day, now.getUTCDate()) : Math.min(day, 28);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, safeDay, 12, 0, 0));
};

const monthKey = (monthsAgo) => {
  const d = monthDate(monthsAgo, 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// ---------- seed (directly into the throwaway DB) ----------
// Orders are backdated across 5 months so the zero-fill, revenue and ranking
// assertions have real data. createdAt is set with the native driver because
// mongoose timestamps would otherwise stamp "now".
async function seed() {
  const { default: User } = await import('../src/models/User.js');
  const { default: Artisan } = await import('../src/models/Artisan.js');
  const { default: Product } = await import('../src/models/Product.js');
  const { default: Order } = await import('../src/models/Order.js');

  const [adminUser, c1, c2, c3, a1User, a2User, newUser] = await User.create([
    { name: 'E2E Admin', email: 'admin@e2e.test', password: 'Test@1234', role: 'ADMIN' },
    { name: 'E2E Customer 1', email: 'c1@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Customer 2', email: 'c2@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Customer 3', email: 'c3@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Artisan 1', email: 'a1@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Artisan 2', email: 'a2@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Backdated User', email: 'new@e2e.test', password: 'Test@1234', role: 'CUSTOMER' }
  ]);

  // One signup inside the window (2 months back) for the new-users series.
  await User.collection.updateOne(
    { _id: newUser._id },
    { $set: { createdAt: monthDate(2, 10) } }
  );

  const [art1, art2] = await Artisan.create([
    {
      user: a1User._id, businessName: 'E2E Textile House', description: 'Weaves',
      craftTypes: ['textiles'], isVerified: true
    },
    {
      user: a2User._id, businessName: 'E2E Clay Studio', description: 'Pots',
      craftTypes: ['pottery'], isVerified: true
    }
  ]);

  const [pTextile, pJewel, pPottery, pWood] = await Product.create([
    { name: 'E2E Scarf', description: 'woven', price: 1000, category: 'textiles', craftType: 'handloom', artisan: art1._id },
    { name: 'E2E Pendant', description: 'silver', price: 500, category: 'jewelry', craftType: 'metal', artisan: art1._id },
    { name: 'E2E Vase', description: 'clay', price: 2000, category: 'pottery', craftType: 'wheel', artisan: art2._id },
    { name: 'E2E Carving', description: 'wood', price: 4000, category: 'woodwork', craftType: 'carving', artisan: art2._id }
  ]);

  const address = { street: '1 Test Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' };

  const orderSeeds = [
    // monthsAgo, day, buyer, product, qty, status, payment
    [0, 5, c1, pTextile, 2, 'delivered', 'paid'],      // current month, revenue 2000
    [0, 6, c2, pWood, 1, 'cancelled', 'refunded'],     // current month, revenue EXCLUDED
    [2, 10, c3, pPottery, 1, 'shipped', 'paid'],       // 2 months back, revenue 2000
    [4, 12, c1, pJewel, 3, 'pending', 'pending'],      // 4 months back, revenue 1500
    [5, 15, c2, pTextile, 1, 'delivered', 'paid']      // 5 months back, revenue 1000
  ];

  const orders = [];
  for (const [monthsAgo, day, buyer, product, quantity, orderStatus, paymentStatus] of orderSeeds) {
    const subtotal = product.price * quantity;
    const order = await Order.create({
      user: buyer._id,
      items: [{ product: product._id, quantity, price: product.price }],
      shippingAddress: address,
      subtotal,
      shippingCost: 0,
      tax: 0,
      total: subtotal,
      paymentMethod: 'upi',
      paymentStatus,
      orderStatus,
      notes: `e2e-ts:${monthsAgo}-${orderStatus}`
    });
    await Order.collection.updateOne(
      { _id: order._id },
      { $set: { createdAt: monthDate(monthsAgo, day) } }
    );
    orders.push(order);
  }

  return {
    creds: {
      admin: { email: 'admin@e2e.test', password: 'Test@1234' },
      customer: { email: 'c1@e2e.test', password: 'Test@1234' }
    },
    counts: {
      users: 6, // 7 created minus the admin (admins are not charted)
      orders: 5
    },
    keys: {
      now: monthKey(0),
      back2: monthKey(2),
      back4: monthKey(4),
      back5: monthKey(5),
      empty1: monthKey(1),
      empty3: monthKey(3)
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
  const { creds, counts, keys } = seedData;
  const tAdmin = await login(creds.admin);
  const tCustomer = await login(creds.customer);

  await check('health endpoint responds', async () => {
    const { status, json } = await req('GET', '/health');
    assert(status === 200 && json.status === 'ok', `got ${status}`);
  });

  // ---- auth ----
  await check('timeseries: unauthenticated -> 401', async () => {
    const { status } = await req('GET', '/admin/stats/timeseries');
    assert(status === 401, `got ${status}`);
  });

  await check('timeseries: customer -> 403', async () => {
    const { status } = await req('GET', '/admin/stats/timeseries', { token: tCustomer });
    assert(status === 403, `got ${status}`);
  });

  await check('timeseries: admin -> 200 with all series present', async () => {
    const { status, json } = await req('GET', '/admin/stats/timeseries', { token: tAdmin });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.months === 6, `months=${json.months}`);
    assert(Array.isArray(json.timeline) && json.timeline.length === 6, 'timeline must have 6 buckets');
    assert(Array.isArray(json.ordersByStatus), 'ordersByStatus missing');
    assert(Array.isArray(json.topCategories), 'topCategories missing');
    assert(Array.isArray(json.topArtisans), 'topArtisans missing');
  });

  // ---- timeline shape + zero fill ----
  await check('timeline: keys are contiguous months ending in the current month', async () => {
    const { json } = await req('GET', '/admin/stats/timeseries', { token: tAdmin });
    const timeline = json.timeline;
    assert(timeline[5].key === keys.now, `last key=${timeline[5].key}, want ${keys.now}`);
    const seen = new Set(timeline.map((t) => t.key));
    assert(seen.size === 6, `duplicate keys: ${timeline.map((t) => t.key).join(',')}`);
    assert(seen.has(keys.back5) && seen.has(keys.empty3), 'expected months missing from window');
    for (const row of timeline) {
      assert(typeof row.revenue === 'number' && typeof row.orders === 'number' && typeof row.newUsers === 'number',
        `non-numeric bucket: ${JSON.stringify(row)}`);
    }
  });

  await check('timeline: months with no data are zero-filled (no gaps)', async () => {
    const { json } = await req('GET', '/admin/stats/timeseries', { token: tAdmin });
    const byKey = Object.fromEntries(json.timeline.map((t) => [t.key, t]));
    assert(byKey[keys.empty1].orders === 0 && byKey[keys.empty1].revenue === 0,
      `${keys.empty1} should be empty, got ${JSON.stringify(byKey[keys.empty1])}`);
    assert(byKey[keys.empty3].orders === 0 && byKey[keys.empty3].revenue === 0,
      `${keys.empty3} should be empty, got ${JSON.stringify(byKey[keys.empty3])}`);
    assert(byKey[keys.back4].orders === 1 && byKey[keys.back4].revenue === 1500,
      `${keys.back4}=${JSON.stringify(byKey[keys.back4])}`);
    assert(byKey[keys.back5].orders === 1 && byKey[keys.back5].revenue === 1000,
      `${keys.back5}=${JSON.stringify(byKey[keys.back5])}`);
  });

  await check('timeline: current month counts all orders but revenue skips cancelled', async () => {
    const { json } = await req('GET', '/admin/stats/timeseries', { token: tAdmin });
    const now = json.timeline.find((t) => t.key === keys.now);
    assert(now.orders === 2, `orders=${now.orders} (delivered + cancelled)`);
    assert(now.revenue === 2000, `revenue=${now.revenue} (cancelled 4000 must be excluded)`);
  });

  await check('timeline: new users counted per month, admins excluded', async () => {
    const { json } = await req('GET', '/admin/stats/timeseries', { token: tAdmin });
    const total = json.timeline.reduce((sum, t) => sum + t.newUsers, 0);
    assert(total === counts.users, `sum of newUsers=${total}, want ${counts.users}`);
    const back2 = json.timeline.find((t) => t.key === keys.back2);
    assert(back2.newUsers === 1, `backdated signup missing (got ${back2.newUsers})`);
  });

  // ---- months parameter ----
  await check('months=3 shrinks the window and drops older orders', async () => {
    const { json } = await req('GET', '/admin/stats/timeseries?months=3', { token: tAdmin });
    assert(json.months === 3 && json.timeline.length === 3, `length=${json.timeline.length}`);
    const totalOrders = json.timeline.reduce((sum, t) => sum + t.orders, 0);
    const totalRevenue = json.timeline.reduce((sum, t) => sum + t.revenue, 0);
    // only the two current-month orders + the 2-months-back order survive
    assert(totalOrders === 3, `orders in 3 months=${totalOrders}`);
    assert(totalRevenue === 4000, `revenue in 3 months=${totalRevenue}`);
    assert(json.timeline[2].key === keys.now, `last key=${json.timeline[2].key}`);
  });

  await check('months=12 and months=1 return the right bucket counts', async () => {
    const { json: y } = await req('GET', '/admin/stats/timeseries?months=12', { token: tAdmin });
    assert(y.timeline.length === 12, `months=12 -> ${y.timeline.length}`);
    const { json: o } = await req('GET', '/admin/stats/timeseries?months=1', { token: tAdmin });
    assert(o.timeline.length === 1 && o.timeline[0].key === keys.now, 'months=1 wrong');
    const totalOrders = o.timeline.reduce((sum, t) => sum + t.orders, 0);
    assert(totalOrders === 2, `current month orders=${totalOrders}`);
  });

  await check('validation: months=0 / months=25 / months=abc -> 400', async () => {
    for (const bad of ['0', '25', 'abc']) {
      const { status } = await req('GET', `/admin/stats/timeseries?months=${bad}`, { token: tAdmin });
      assert(status === 400, `months=${bad} got ${status}`);
    }
  });

  // ---- orders by status ----
  await check('ordersByStatus: counts every status in the window', async () => {
    const { json } = await req('GET', '/admin/stats/timeseries', { token: tAdmin });
    const map = Object.fromEntries(json.ordersByStatus.map((s) => [s.status, s.count]));
    assert(map.delivered === 2, `delivered=${map.delivered}`);
    assert(map.cancelled === 1, `cancelled=${map.cancelled}`);
    assert(map.shipped === 1 && map.pending === 1, JSON.stringify(map));
    const sum = json.ordersByStatus.reduce((acc, s) => acc + s.count, 0);
    assert(sum === counts.orders, `status counts sum=${sum}, want ${counts.orders}`);
  });

  // ---- top categories ----
  await check('topCategories: ranked by revenue, cancelled orders excluded', async () => {
    const { json } = await req('GET', '/admin/stats/timeseries', { token: tAdmin });
    assert(json.topCategories.length === 3, `got ${json.topCategories.length} categories`);
    assert(json.topCategories[0].category === 'textiles' && json.topCategories[0].revenue === 3000,
      `first=${JSON.stringify(json.topCategories[0])} (want textiles 3000)`);
    assert(json.topCategories[0].itemsSold === 3, `itemsSold=${json.topCategories[0].itemsSold}`);
    assert(json.topCategories[1].category === 'pottery' && json.topCategories[1].revenue === 2000,
      `second=${JSON.stringify(json.topCategories[1])}`);
    assert(json.topCategories[2].category === 'jewelry' && json.topCategories[2].revenue === 1500,
      `third=${JSON.stringify(json.topCategories[2])}`);
    assert(!json.topCategories.some((c) => c.category === 'woodwork'),
      'woodwork came only from a cancelled order — must be excluded');
  });

  // ---- top artisans ----
  await check('topArtisans: ranked by revenue with business names', async () => {
    const { json } = await req('GET', '/admin/stats/timeseries', { token: tAdmin });
    assert(json.topArtisans.length === 2, `got ${json.topArtisans.length}`);
    assert(json.topArtisans[0].name === 'E2E Textile House' && json.topArtisans[0].revenue === 4500,
      `first=${JSON.stringify(json.topArtisans[0])} (want Textile House 4500 = 2000 + 1500 + 1000)`);
    assert(json.topArtisans[0].itemsSold === 6, `itemsSold=${json.topArtisans[0].itemsSold}`);
    assert(json.topArtisans[1].name === 'E2E Clay Studio' && json.topArtisans[1].revenue === 2000,
      `second=${JSON.stringify(json.topArtisans[1])} (want Clay Studio 2000; its 4000 woodwork order was cancelled)`);
    assert(json.topArtisans[0].revenue >= json.topArtisans[1].revenue, 'not sorted desc');
  });
}

// ---------- main ----------
async function main() {
  console.log(`Step 8 admin timeseries E2E — db=${TEST_DB}, port=${PORT}, timeout=${TEST_TIMEOUT_MS / 1000}s`);

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
