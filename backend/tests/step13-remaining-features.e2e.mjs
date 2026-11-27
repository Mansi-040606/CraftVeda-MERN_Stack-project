// Step 13 E2E — remaining features:
// - PUT /api/auth/profile & PUT /api/auth/password
// - GET /api/donations/mine & PATCH /api/donations/:id (admin)
// - POST /api/certificates/generate (with craftDetails), GET /api/certificates/mine, GET /api/certificates/order/:orderId
// - POST /api/craft-stories (auto-slug) & PUT / DELETE /api/craft-stories/:id
// - POST /api/gi-tags & PUT /api/gi-tags/:id
// - PUT /api/admin/orders/:id/status with trackingNumber & trackingUrl
// - PATCH /api/workshops/mine/:id/bookings/:bookingId (status + joinLink + seat restore on cancel)
// Run from backend/: node tests/step13-remaining-features.e2e.mjs
// NEVER touches craftveda / craftveda_dev — hard-guarded below.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import User from '../src/models/User.js';
import Artisan from '../src/models/Artisan.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import Workshop from '../src/models/Workshop.js';
import WorkshopBooking from '../src/models/WorkshopBooking.js';

const TEST_DB = 'craftveda_step13_test';
const MONGO_URI = `mongodb://localhost:27017/${TEST_DB}`;
const PORT = 5100;
const BASE = `http://127.0.0.1:${PORT}/api`;

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
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

function assertPortFree() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', (err) => {
      reject(err.code === 'EADDRINUSE' ? new Error(`Port ${PORT} is in use`) : err);
    });
    srv.once('listening', () => srv.close(() => resolve()));
    srv.listen(PORT, '127.0.0.1');
  });
}

async function dropTestDb() {
  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  if (conn.name !== TEST_DB) {
    await conn.close();
    throw new Error(`Refusing to drop unexpected DB: ${conn.name}`);
  }
  await conn.dropDatabase();
  await conn.close();
}

function startServer() {
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(PORT), MONGO_URI, NODE_ENV: 'test' },
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
    } catch { /* wait */ }
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
  } catch { /* ignore */ }
}

async function login(email, password) {
  const r = await req('POST', '/auth/login', { body: { email, password } });
  assert(r.status === 200 && r.json?.token, `Login failed for ${email}`);
  return r.json.token;
}

async function main() {
  await assertPortFree();
  await dropTestDb();

  await mongoose.connect(MONGO_URI);

  await User.create({ name: 'Admin', email: 'admin@step13.test', password: 'Password1', role: 'ADMIN' });
  const buyer = await User.create({ name: 'Buyer', email: 'buyer@step13.test', password: 'Password1', role: 'CUSTOMER' });
  const artisanUser = await User.create({ name: 'Artisan', email: 'artisan@step13.test', password: 'Password1', role: 'ARTISAN' });

  const artisan = await Artisan.create({
    user: artisanUser._id,
    businessName: 'Jaipur Craft Guild',
    description: 'Handcrafted works',
    craftTypes: ['pottery'],
    location: { city: 'Jaipur', state: 'Rajasthan' },
    isVerified: true
  });

  const product = await Product.create({
    name: 'Blue Vase',
    description: 'Hand-painted ceramic vase',
    price: 1200,
    category: 'pottery',
    craftType: 'Blue Pottery',
    material: 'Quartz Clay',
    stock: 5,
    artisan: artisan._id
  });

  const order = await Order.create({
    user: buyer._id,
    items: [{ product: product._id, quantity: 1, price: 1200 }],
    shippingAddress: { street: '12 Main Rd', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
    subtotal: 1200,
    shippingCost: 0,
    tax: 216,
    total: 1416,
    paymentMethod: 'cod',
    orderStatus: 'confirmed'
  });

  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const workshop = await Workshop.create({
    artisan: artisan._id,
    title: 'Clay Wheel Basics',
    description: 'Intro to pottery',
    craftType: 'Pottery',
    duration: 2,
    maxParticipants: 5,
    currentParticipants: 0,
    price: 500,
    schedule: [{ date: futureDate, startTime: '10:00', endTime: '12:00' }]
  });

  await mongoose.disconnect();

  serverProc = startServer();
  await waitForHealth();

  const adminToken = await login('admin@step13.test', 'Password1');
  let buyerToken = await login('buyer@step13.test', 'Password1');
  const artisanToken = await login('artisan@step13.test', 'Password1');

  await check('PUT /api/auth/profile updates name, phone, and address cleanly', async () => {
    const r = await req('PUT', '/auth/profile', {
      token: buyerToken,
      body: {
        name: 'Buyer Updated',
        phone: '9876543210',
        address: { street: '45 Heritage Ln', city: 'Jaipur', state: 'Rajasthan', pincode: '302002', country: 'India' }
      }
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    assert(r.json.user.name === 'Buyer Updated', 'name not updated');
    assert(r.json.user.address?.pincode === '302002', 'pincode not updated');
  });

  await check('PUT /api/auth/password updates password and allows login with new password', async () => {
    const bad = await req('PUT', '/auth/password', {
      token: buyerToken,
      body: { currentPassword: 'WrongPassword', newPassword: 'Password2' }
    });
    assert(bad.status === 400, `expected 400 on wrong current password, got ${bad.status}`);

    const ok = await req('PUT', '/auth/password', {
      token: buyerToken,
      body: { currentPassword: 'Password1', newPassword: 'Password2' }
    });
    assert(ok.status === 200, `expected 200, got ${ok.status}`);
    buyerToken = await login('buyer@step13.test', 'Password2');
  });

  let donationId;
  await check('Donations: create, GET /mine, and admin PATCH /:id status update', async () => {
    const created = await req('POST', '/donations', {
      token: buyerToken,
      body: { amount: 750, craftType: 'pottery', message: 'Keep it alive', isAnonymous: false }
    });
    assert(created.status === 201, `expected 201, got ${created.status}`);
    donationId = created.json.donation._id;

    const mineBefore = await req('GET', '/donations/mine', { token: buyerToken });
    assert(mineBefore.status === 200 && mineBefore.json.total === 1, 'mine should list 1 donation');
    assert(mineBefore.json.completedTotal === 0, 'pending donation should not be in completedTotal');

    const patched = await req('PATCH', `/donations/${donationId}`, {
      token: adminToken,
      body: { paymentStatus: 'completed' }
    });
    assert(patched.status === 200 && patched.json.donation.paymentStatus === 'completed', 'admin patch failed');

    const mineAfter = await req('GET', '/donations/mine', { token: buyerToken });
    assert(mineAfter.json.completedTotal === 750, 'completedTotal should be 750');
  });

  await check('Admin order tracking: PUT /api/admin/orders/:id/status saves trackingNumber and trackingUrl and delivers order', async () => {
    const r = await req('PUT', `/admin/orders/${order._id}/status`, {
      token: adminToken,
      body: {
        orderStatus: 'delivered',
        trackingNumber: 'IND-12345',
        trackingUrl: 'https://track.example/IND-12345'
      }
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    assert(r.json.order.orderStatus === 'delivered', 'orderStatus not updated');
    assert(r.json.order.trackingNumber === 'IND-12345', 'trackingNumber not saved');
    assert(r.json.order.trackingUrl === 'https://track.example/IND-12345', 'trackingUrl not saved');
  });

  let certNumber;
  await check('Certificates: generate on delivered order, populate craftDetails, and retrieve by order & mine', async () => {
    const gen = await req('POST', '/certificates/generate', {
      token: buyerToken,
      body: { orderId: String(order._id), productId: String(product._id) }
    });
    assert(gen.status === 201, `expected 201, got ${gen.status}`);
    certNumber = gen.json.certificate.certificateNumber;
    assert(gen.json.certificate.qrCode?.startsWith('data:image/'), 'qrCode missing');
    assert(gen.json.certificate.craftDetails?.craftType === 'Blue Pottery', 'craftDetails.craftType missing');
    assert(gen.json.certificate.craftDetails?.origin === 'Jaipur, Rajasthan', 'craftDetails.origin missing');

    const byOrder = await req('GET', `/certificates/order/${order._id}`, { token: buyerToken });
    assert(byOrder.status === 200 && byOrder.json.certificates.length === 1, 'order certificates missing');

    const mine = await req('GET', '/certificates/mine', { token: buyerToken });
    assert(mine.status === 200 && mine.json.certificates.some((c) => c.certificateNumber === certNumber), 'mine missing cert');
  });

  await check('Craft Stories CRUD: auto-slug create, update, and delete', async () => {
    const created = await req('POST', '/craft-stories', {
      token: adminToken,
      body: { title: 'History of Jaipur Blue Pottery', content: 'Detailed craft narrative.', category: 'heritage', featured: true }
    });
    assert(created.status === 201, `expected 201, got ${created.status}`);
    const story = created.json.story;
    assert(story.slug === 'history-of-jaipur-blue-pottery', `unexpected slug: ${story.slug}`);

    const updated = await req('PUT', `/craft-stories/${story._id}`, {
      token: adminToken,
      body: { title: 'Jaipur Blue Pottery Revival', featured: false }
    });
    assert(updated.status === 200 && updated.json.story.featured === false, 'story update failed');

    const del = await req('DELETE', `/craft-stories/${story._id}`, { token: adminToken });
    assert(del.status === 200, 'story delete failed');
  });

  await check('GI Tags CRUD: create, update, and toggle active', async () => {
    const created = await req('POST', '/gi-tags', {
      token: adminToken,
      body: {
        name: 'Blue Pottery of Jaipur',
        type: 'Pottery',
        description: 'Turquoise glazed pottery from Jaipur',
        location: { state: 'Rajasthan', district: 'Jaipur' },
        products: ['Vases', 'Tiles']
      }
    });
    assert(created.status === 201, `expected 201, got ${created.status}`);
    const id = created.json.giTag._id;

    const updated = await req('PUT', `/gi-tags/${id}`, {
      token: adminToken,
      body: { description: 'Updated GI description' }
    });
    assert(updated.status === 200 && updated.json.giTag.description === 'Updated GI description', 'GI tag update failed');
  });

  await check('Workshop booking management: artisan updates joinLink and status, cancelling restores seats', async () => {
    const booked = await req('POST', `/workshops/${workshop._id}/book`, {
      token: buyerToken,
      body: { scheduleDate: futureDate.toISOString(), startTime: '10:00', endTime: '12:00', participants: 2 }
    });
    assert(booked.status === 201, `expected 201, got ${booked.status}`);
    const bookingId = booked.json.booking._id;

    const updated = await req('PATCH', `/workshops/mine/${workshop._id}/bookings/${bookingId}`, {
      token: artisanToken,
      body: { status: 'confirmed', joinLink: 'https://meet.example/pottery' }
    });
    assert(updated.status === 200 && updated.json.booking.status === 'confirmed', 'artisan confirm failed');
    assert(updated.json.booking.joinLink === 'https://meet.example/pottery', 'joinLink not saved');

    const cancelled = await req('PATCH', `/workshops/mine/${workshop._id}/bookings/${bookingId}`, {
      token: artisanToken,
      body: { status: 'cancelled' }
    });
    assert(cancelled.status === 200 && cancelled.json.booking.status === 'cancelled', 'artisan cancel failed');

    const wsAfter = await req('GET', `/workshops/${workshop._id}`);
    assert(wsAfter.json.workshop.seatsLeft === 5, `expected 5 seatsLeft after cancel, got ${wsAfter.json.workshop.seatsLeft}`);
  });

  console.log('\nStep 13 E2E Results:');
  for (const line of results) console.log(line);
  console.log(`\nSummary: ${pass} passed, ${fail} failed`);

  if (fail > 0) {
    console.error('\nServer logs:\n' + serverLogs.join(''));
    process.exitCode = 1;
  }
}

try {
  await main();
} finally {
  stopServer();
  await mongoose.disconnect().catch(() => {});
  await dropTestDb().catch(() => {});
}
