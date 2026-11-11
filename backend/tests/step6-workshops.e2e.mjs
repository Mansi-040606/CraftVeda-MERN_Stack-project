// Step 6 E2E — workshops (artisan CRUD, booking rules, cancel, my-bookings)
// and the artisan own-profile GET, on a throwaway database.
// Run from backend/: node tests/step6-workshops.e2e.mjs
// NEVER touches craftveda / craftveda_dev — hard-guarded below.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DB = 'craftveda_step6_test';
const MONGO_URI = `mongodb://localhost:27017/${TEST_DB}`;
const PORT = 5097;
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

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

// ---------- seed (directly into the throwaway DB) ----------
// W1 (a1, active, 3 seats, 1 already booked x2 by customer2)  -> booking + delete-block tests
// W2 (a2, active, clean)                                      -> delete-by-owner test
// W3 (a1, inactive)                                           -> inactive booking test
// W4 (a1, past schedule + past booking by customer2)          -> past booking / cancel-after-date tests
async function seed() {
  const { default: User } = await import('../src/models/User.js');
  const { default: Artisan } = await import('../src/models/Artisan.js');
  const { default: Workshop } = await import('../src/models/Workshop.js');
  const { default: WorkshopBooking } = await import('../src/models/WorkshopBooking.js');

  const [artisanAUser, artisanBUser, noProfileUser, customer1, customer2, adminUser] = await User.create([
    { name: 'E2E Artisan A', email: 'artisan-a@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Artisan B', email: 'artisan-b@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Artisan No Profile', email: 'artisan-np@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Customer One', email: 'customer1@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Customer Two', email: 'customer2@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Admin', email: 'admin@e2e.test', password: 'Test@1234', role: 'ADMIN' }
  ]);

  const [a1, a2] = await Artisan.create([
    {
      user: artisanAUser._id, businessName: 'E2E Block Printers', description: 'Test printer',
      craftTypes: ['textiles'], story: 'We print blocks', isVerified: true,
      location: { type: 'Point', coordinates: [0, 0], city: 'Jaipur', state: 'Rajasthan' }
    },
    {
      user: artisanBUser._id, businessName: 'E2E Potters', description: 'Test potter',
      craftTypes: ['pottery'], isVerified: false
    }
  ]);

  const [w1, w2, w3, w4] = await Workshop.create([
    {
      artisan: a1._id, title: 'E2E Block Printing Basics', description: 'Learn block printing',
      craftType: 'textiles', duration: 3, durationUnit: 'hours', maxParticipants: 3,
      currentParticipants: 2, price: 500, level: 'beginner',
      location: { type: 'offline', city: 'Jaipur', state: 'Rajasthan' },
      schedule: [{ date: daysFromNow(10), startTime: '10:00', endTime: '13:00' }],
      isActive: true
    },
    {
      artisan: a2._id, title: 'E2E Pottery Wheel', description: 'Throw pots on the wheel',
      craftType: 'pottery', duration: 2, durationUnit: 'hours', maxParticipants: 2,
      currentParticipants: 0, price: 800, level: 'all',
      location: { type: 'online' },
      schedule: [{ date: daysFromNow(14), startTime: '14:00', endTime: '16:00' }],
      isActive: true
    },
    {
      artisan: a1._id, title: 'E2E Inactive Workshop', description: 'Hidden workshop',
      craftType: 'textiles', duration: 1, maxParticipants: 5, price: 100,
      schedule: [{ date: daysFromNow(20), startTime: '09:00', endTime: '11:00' }],
      isActive: false
    },
    {
      artisan: a1._id, title: 'E2E Past Workshop', description: 'Already happened',
      craftType: 'textiles', duration: 1, maxParticipants: 5, currentParticipants: 1, price: 100,
      schedule: [{ date: daysFromNow(-5), startTime: '09:00', endTime: '11:00' }],
      isActive: true
    }
  ]);

  const [b1, b3] = await WorkshopBooking.create([
    {
      workshop: w1._id, user: customer2._id, scheduleDate: daysFromNow(10),
      startTime: '10:00', endTime: '13:00', participants: 2, amount: 1000
    },
    {
      workshop: w4._id, user: customer2._id, scheduleDate: daysFromNow(-5),
      startTime: '09:00', endTime: '11:00', participants: 1, amount: 100
    }
  ]);

  return {
    ids: {
      a1: a1._id.toString(),
      w1: w1._id.toString(),
      w2: w2._id.toString(),
      w3: w3._id.toString(),
      w4: w4._id.toString(),
      b1: b1._id.toString(),
      b3: b3._id.toString()
    },
    creds: {
      artisanA: { email: 'artisan-a@e2e.test', password: 'Test@1234' },
      artisanB: { email: 'artisan-b@e2e.test', password: 'Test@1234' },
      noProfile: { email: 'artisan-np@e2e.test', password: 'Test@1234' },
      customer1: { email: 'customer1@e2e.test', password: 'Test@1234' },
      customer2: { email: 'customer2@e2e.test', password: 'Test@1234' },
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
  const tA = await login(creds.artisanA);
  const tB = await login(creds.artisanB);
  const tNP = await login(creds.noProfile);
  const tC1 = await login(creds.customer1);
  const tC2 = await login(creds.customer2);
  const tAdmin = await login(creds.admin);

  await check('health endpoint responds', async () => {
    const { status, json } = await req('GET', '/health');
    assert(status === 200 && json.status === 'ok', `got ${status}`);
  });

  // ---- GET /artisans/me (own profile for the edit page) ----
  await check('GET /artisans/me: artisan gets own profile', async () => {
    const { status, json } = await req('GET', '/artisans/me', { token: tA });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.artisan.businessName === 'E2E Block Printers', `got ${json.artisan.businessName}`);
    assert(json.artisan.user?.name === 'E2E Artisan A', 'user not populated');
  });

  await check('GET /artisans/me: customer -> 403, artisan w/o profile -> 403', async () => {
    const cust = await req('GET', '/artisans/me', { token: tC1 });
    assert(cust.status === 403, `customer got ${cust.status}`);
    const np = await req('GET', '/artisans/me', { token: tNP });
    assert(np.status === 403, `no-profile artisan got ${np.status}`);
  });

  // ---- GET /workshops (public list + filters) ----
  await check('public list hides inactive workshops', async () => {
    const { status, json } = await req('GET', '/workshops');
    assert(status === 200, `got ${status}`);
    const titles = json.workshops.map((w) => w.title);
    assert(!titles.includes('E2E Inactive Workshop'), 'inactive workshop leaked');
    assert(titles.includes('E2E Block Printing Basics'), 'W1 missing');
    assert(titles.includes('E2E Pottery Wheel'), 'W2 missing');
    assert(titles.includes('E2E Past Workshop'), 'W4 missing');
  });

  await check('public list attaches seatsLeft', async () => {
    const { json } = await req('GET', '/workshops');
    const w1 = json.workshops.find((w) => String(w._id) === ids.w1);
    assert(w1.seatsLeft === 1, `W1 seatsLeft=${w1.seatsLeft} (max 3, booked 2)`);
  });

  await check('craftType filter returns only matching workshops', async () => {
    const { json } = await req('GET', '/workshops?craftType=textiles');
    assert(json.workshops.every((w) => w.craftType === 'textiles'), 'non-textiles leaked');
    assert(json.workshops.some((w) => String(w._id) === ids.w1), 'W1 missing');
    assert(!json.workshops.some((w) => String(w._id) === ids.w2), 'W2 leaked');
  });

  await check('location + city filters work', async () => {
    const { json } = await req('GET', '/workshops?location=offline&city=jaipur');
    assert(json.total === 1, `total=${json.total}`);
    assert(String(json.workshops[0]._id) === ids.w1, `got ${json.workshops[0]._id}`);
  });

  await check('from/to date filter keeps only future-scheduled workshops', async () => {
    const { json } = await req('GET', `/workshops?from=${daysFromNow(5).toISOString()}`);
    const idsFound = json.workshops.map((w) => String(w._id));
    assert(idsFound.includes(ids.w1), 'W1 missing');
    assert(idsFound.includes(ids.w2), 'W2 missing');
    assert(!idsFound.includes(ids.w4), 'W4 (past) leaked');
  });

  await check('search filter finds by title (regex, no text index needed)', async () => {
    const { json } = await req('GET', '/workshops?search=Block%20Printing');
    assert(json.total >= 1, `total=${json.total}`);
    assert(String(json.workshops[0]._id) === ids.w1, `got ${json.workshops[0]._id}`);
  });

  await check('validation: bad query values -> 400', async () => {
    const bad = await req('GET', '/workshops?level=weird');
    assert(bad.status === 400, `level=weird got ${bad.status}`);
    const bad2 = await req('GET', '/workshops?from=not-a-date');
    assert(bad2.status === 400, `from=not-a-date got ${bad2.status}`);
    const bad3 = await req('GET', '/workshops?page=0');
    assert(bad3.status === 400, `page=0 got ${bad3.status}`);
  });

  // ---- GET /workshops/:id ----
  await check('workshop detail: 200 with seatsLeft + populated artisan', async () => {
    const { status, json } = await req('GET', `/workshops/${ids.w1}`);
    assert(status === 200, `got ${status}`);
    assert(json.workshop.seatsLeft === 1, `seatsLeft=${json.workshop.seatsLeft}`);
    assert(json.workshop.artisan?.businessName === 'E2E Block Printers', 'artisan not populated');
    assert(json.workshop.artisan?.user, 'artisan.user not populated');
  });

  await check('workshop detail: missing -> 404, invalid id -> 400', async () => {
    const missing = await req('GET', '/workshops/aaaaaaaaaaaaaaaaaaaaaaaa');
    assert(missing.status === 404, `missing got ${missing.status}`);
    const invalid = await req('GET', '/workshops/not-an-id');
    assert(invalid.status === 400, `invalid got ${invalid.status}`);
  });

  // ---- artisan CRUD ----
  await check('create workshop: customer -> 403, artisan w/o profile -> 403', async () => {
    const validBody = {
      title: 'Some Workshop', description: 'x', craftType: 'y',
      duration: 1, maxParticipants: 1, price: 1
    };
    const cust = await req('POST', '/workshops/mine', { token: tC1, body: validBody });
    assert(cust.status === 403, `customer got ${cust.status}`);
    const np = await req('POST', '/workshops/mine', { token: tNP, body: validBody });
    assert(np.status === 403, `no-profile got ${np.status}`);
  });

  let createdId = null;
  await check('create workshop: artisan creates own (201, artisan auto-assigned)', async () => {
    const { status, json } = await req('POST', '/workshops/mine', {
      token: tA,
      body: {
        title: 'E2E Kalamkari Intro', description: 'Paint with natural dyes',
        craftType: 'textiles', duration: 4, durationUnit: 'hours',
        maxParticipants: 6, price: 750, level: 'intermediate',
        location: { type: 'offline', city: 'Srikalahasti' },
        schedule: [{ date: daysFromNow(7).toISOString(), startTime: '11:00', endTime: '15:00' }]
      }
    });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
    assert(String(json.workshop.artisan) === ids.a1, `artisan=${json.workshop.artisan}`);
    assert(json.workshop.currentParticipants === 0, 'currentParticipants not reset');
    assert(json.workshop.seatsLeft === 6, `seatsLeft=${json.workshop.seatsLeft}`);
    createdId = String(json.workshop._id);
  });

  await check('create workshop: validation rejects missing/invalid fields -> 400', async () => {
    const missing = await req('POST', '/workshops/mine', { token: tA, body: { description: 'x', craftType: 'y', duration: 1, maxParticipants: 1, price: 1 } });
    assert(missing.status === 400, `missing title got ${missing.status}`);
    const zero = await req('POST', '/workshops/mine', {
      token: tA,
      body: { title: 'Bad workshop', description: 'x', craftType: 'y', duration: 1, maxParticipants: 0, price: 1 }
    });
    assert(zero.status === 400, `maxParticipants=0 got ${zero.status}`);
  });

  await check('GET /workshops/mine: own list with booking counts', async () => {
    const { status, json } = await req('GET', '/workshops/mine', { token: tA });
    assert(status === 200, `got ${status}`);
    assert(json.total === 4, `total=${json.total} (W1, W3, W4, created)`);
    const w1 = json.workshops.find((w) => String(w._id) === ids.w1);
    assert(w1.bookingCount === 1, `W1 bookingCount=${w1.bookingCount}`);
    assert(w1.seatsBooked === 2, `W1 seatsBooked=${w1.seatsBooked}`);
    const bList = await req('GET', '/workshops/mine', { token: tB });
    assert(bList.json.total === 1, `artisanB total=${bList.json.total}`);
  });

  await check('GET /workshops/mine: customer -> 403', async () => {
    const { status } = await req('GET', '/workshops/mine', { token: tC1 });
    assert(status === 403, `got ${status}`);
  });

  await check('update workshop: owner updates title -> 200', async () => {
    const { status, json } = await req('PUT', `/workshops/mine/${ids.w1}`, {
      token: tA, body: { title: 'E2E Block Printing Masters' }
    });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.workshop.title === 'E2E Block Printing Masters', `title=${json.workshop.title}`);
  });

  await check('update workshop: other artisan -> 403, customer -> 403', async () => {
    const other = await req('PUT', `/workshops/mine/${ids.w1}`, { token: tB, body: { title: 'Hijacked' } });
    assert(other.status === 403, `artisanB got ${other.status}`);
    const cust = await req('PUT', `/workshops/mine/${ids.w1}`, { token: tC1, body: { title: 'Hijacked' } });
    assert(cust.status === 403, `customer got ${cust.status}`);
  });

  await check('update workshop: maxParticipants below booked seats -> 400', async () => {
    const { status, json } = await req('PUT', `/workshops/mine/${ids.w1}`, {
      token: tA, body: { maxParticipants: 1 }
    });
    assert(status === 400, `got ${status}: ${JSON.stringify(json)}`);
    assert(/already booked/i.test(json.message), `got: ${json.message}`);
  });

  // ---- booking rules ----
  const futureDate = daysFromNow(10).toISOString();

  await check('book: artisan cannot book own workshop -> 403', async () => {
    const { status, json } = await req('POST', `/workshops/${ids.w1}/book`, {
      token: tA, body: { scheduleDate: futureDate, participants: 1 }
    });
    assert(status === 403, `got ${status}: ${JSON.stringify(json)}`);
  });

  await check('book: inactive workshop -> 400', async () => {
    const { status, json } = await req('POST', `/workshops/${ids.w3}/book`, {
      token: tC1, body: { scheduleDate: daysFromNow(20).toISOString(), participants: 1 }
    });
    assert(status === 400, `got ${status}: ${JSON.stringify(json)}`);
  });

  await check('book: past scheduleDate -> 400', async () => {
    const { status, json } = await req('POST', `/workshops/${ids.w4}/book`, {
      token: tC1, body: { scheduleDate: daysFromNow(-1).toISOString(), participants: 1 }
    });
    assert(status === 400, `got ${status}: ${JSON.stringify(json)}`);
  });

  await check('book: validation rejects participants=0 -> 400', async () => {
    const { status } = await req('POST', `/workshops/${ids.w1}/book`, {
      token: tC1, body: { scheduleDate: futureDate, participants: 0 }
    });
    assert(status === 400, `got ${status}`);
  });

  await check('book: not enough spots (1 seat left, ask 2) -> 400', async () => {
    const { status, json } = await req('POST', `/workshops/${ids.w1}/book`, {
      token: tC1, body: { scheduleDate: futureDate, participants: 2 }
    });
    assert(status === 400, `got ${status}: ${JSON.stringify(json)}`);
    assert(/not enough spots/i.test(json.message), `got: ${json.message}`);
  });

  let bookingId = null;
  await check('book: last seat -> 201, server-side amount, times from schedule slot', async () => {
    const { status, json } = await req('POST', `/workshops/${ids.w1}/book`, {
      token: tC1, body: { scheduleDate: futureDate, participants: 1 }
    });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.booking.amount === 500, `amount=${json.booking.amount} (price 500 x 1)`);
    assert(json.booking.startTime === '10:00' && json.booking.endTime === '13:00', 'times not taken from slot');
    assert(json.booking.status === 'booked', `status=${json.booking.status}`);
    assert(json.booking.paymentStatus === 'pending', 'pay at venue — paymentStatus stays pending');
    bookingId = String(json.booking._id);
  });

  await check('book: seats are now full (seatsLeft=0)', async () => {
    const { json } = await req('GET', `/workshops/${ids.w1}`);
    assert(json.workshop.seatsLeft === 0, `seatsLeft=${json.workshop.seatsLeft}`);
    assert(json.workshop.currentParticipants === 3, `currentParticipants=${json.workshop.currentParticipants}`);
  });

  await check('book: same user twice -> 400 (one booking per user)', async () => {
    const { status, json } = await req('POST', `/workshops/${ids.w1}/book`, {
      token: tC1, body: { scheduleDate: futureDate, participants: 1 }
    });
    assert(status === 400, `got ${status}: ${JSON.stringify(json)}`);
    assert(/already booked/i.test(json.message), `got: ${json.message}`);
  });

  await check('book: unauthenticated -> 401', async () => {
    const { status } = await req('POST', `/workshops/${ids.w1}/book`, {
      body: { scheduleDate: futureDate, participants: 1 }
    });
    assert(status === 401, `got ${status}`);
  });

  // ---- GET /workshops/mine/:id/bookings (who booked my workshop) ----
  await check('workshop bookings: owner sees name / seats / date', async () => {
    const { status, json } = await req('GET', `/workshops/mine/${ids.w1}/bookings`, { token: tA });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.bookings.length === 2, `bookings length=${json.bookings.length}`);
    const c1 = json.bookings.find((b) => b.name === 'E2E Customer One');
    assert(c1 && c1.seats === 1, `customer1 booking: ${JSON.stringify(c1)}`);
    assert(c1.date, 'missing date');
    assert(c1.status === 'booked', `status=${c1.status}`);
    const c2 = json.bookings.find((b) => b.name === 'E2E Customer Two');
    assert(c2 && c2.seats === 2, `customer2 booking: ${JSON.stringify(c2)}`);
  });

  await check('workshop bookings: other artisan -> 403, customer -> 403, bad id -> 400', async () => {
    const other = await req('GET', `/workshops/mine/${ids.w1}/bookings`, { token: tB });
    assert(other.status === 403, `artisanB got ${other.status}`);
    const cust = await req('GET', `/workshops/mine/${ids.w1}/bookings`, { token: tC1 });
    assert(cust.status === 403, `customer got ${cust.status}`);
    const bad = await req('GET', `/workshops/mine/not-an-id/bookings`, { token: tA });
    assert(bad.status === 400, `bad id got ${bad.status}`);
  });

  // ---- GET /workshops/my-bookings ----
  await check('my-bookings: customer sees own bookings with workshop populated', async () => {
    const { status, json } = await req('GET', '/workshops/my-bookings', { token: tC1 });
    assert(status === 200, `got ${status}`);
    assert(json.bookings.length === 1, `length=${json.bookings.length}`);
    assert(json.bookings[0].workshop?.title, 'workshop not populated');
    assert(json.bookings[0].workshop?.price === 500, 'price missing from populate');
  });

  await check('my-bookings: unauthenticated -> 401', async () => {
    const { status } = await req('GET', '/workshops/my-bookings');
    assert(status === 401, `got ${status}`);
  });

  // ---- cancel booking ----
  await check('cancel: other user cannot cancel -> 404', async () => {
    const { status } = await req('DELETE', `/workshops/bookings/${bookingId}`, { token: tC2 });
    assert(status === 404, `got ${status}`);
  });

  await check('cancel: after the workshop date -> 400', async () => {
    const { status, json } = await req('DELETE', `/workshops/bookings/${ids.b3}`, { token: tC2 });
    assert(status === 400, `got ${status}: ${JSON.stringify(json)}`);
    assert(/before the workshop date/i.test(json.message), `got: ${json.message}`);
  });

  await check('cancel: owner cancels -> 200, seats restored', async () => {
    const { status, json } = await req('DELETE', `/workshops/bookings/${bookingId}`, { token: tC1 });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.booking.status === 'cancelled', `status=${json.booking.status}`);
    const { json: w } = await req('GET', `/workshops/${ids.w1}`);
    assert(w.workshop.currentParticipants === 2, `currentParticipants=${w.workshop.currentParticipants} (should be 3-1)`);
    assert(w.workshop.seatsLeft === 1, `seatsLeft=${w.workshop.seatsLeft}`);
  });

  await check('cancel: cancelling twice -> 400', async () => {
    const { status, json } = await req('DELETE', `/workshops/bookings/${bookingId}`, { token: tC1 });
    assert(status === 400, `got ${status}: ${JSON.stringify(json)}`);
    assert(/already cancelled/i.test(json.message), `got: ${json.message}`);
  });

  await check('cancel: freed seat can be rebooked', async () => {
    const { status, json } = await req('POST', `/workshops/${ids.w1}/book`, {
      token: tC1, body: { scheduleDate: futureDate, participants: 1 }
    });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
  });

  // ---- delete ----
  await check('delete: other artisan cannot delete -> 403', async () => {
    const { status } = await req('DELETE', `/workshops/mine/${ids.w2}`, { token: tA });
    assert(status === 403, `got ${status}`);
  });

  await check('delete: blocked while bookings exist -> 400', async () => {
    const { status, json } = await req('DELETE', `/workshops/mine/${ids.w1}`, { token: tA });
    assert(status === 400, `got ${status}: ${JSON.stringify(json)}`);
    assert(/booking/i.test(json.message), `got: ${json.message}`);
  });

  await check('delete: owner deletes a workshop without bookings -> 200', async () => {
    const { status, json } = await req('DELETE', `/workshops/mine/${ids.w2}`, { token: tB });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    const gone = await req('GET', `/workshops/${ids.w2}`);
    assert(gone.status === 404, `W2 still visible (${gone.status})`);
  });

  await check('admin PATCH /workshops/:id still toggles isActive', async () => {
    const { status, json } = await req('PATCH', `/workshops/${ids.w3}`, {
      token: tAdmin, body: { isActive: true }
    });
    assert(status === 200 && json.workshop.isActive === true, `got ${status}`);
    const asArtisan = await req('PATCH', `/workshops/${ids.w3}`, {
      token: tA, body: { isActive: false }
    });
    assert(asArtisan.status === 403, `artisan PATCH got ${asArtisan.status}`);
  });
}

// ---------- main ----------
async function main() {
  console.log(`Step 6 workshops E2E — db=${TEST_DB}, port=${PORT}, timeout=${TEST_TIMEOUT_MS / 1000}s`);

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
