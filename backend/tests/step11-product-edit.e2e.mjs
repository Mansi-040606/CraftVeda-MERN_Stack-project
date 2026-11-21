// Step 11 E2E — artisan product edit endpoints: ownership-checked single
// product load (GET /products/mine/:id), duplication, and full-field updates.
// Run from backend/: node tests/step11-product-edit.e2e.mjs
// NEVER touches craftveda / craftveda_dev — hard-guarded below.
// Runs on a throwaway database and always stops the server + drops the DB.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DB = 'craftveda_step11_test';
const MONGO_URI = `mongodb://localhost:27017/${TEST_DB}`;
const PORT = 5094;
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

function serverEnv() {
  return {
    ...process.env,
    PORT: String(PORT),
    MONGO_URI,
    NODE_ENV: 'test'
  };
}

function startServer() {
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: serverEnv(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', (d) => serverLogs.push(d.toString()));
  proc.stderr.on('data', (d) => serverLogs.push(d.toString()));
  proc.on('error', (err) => serverLogs.push(`spawn error: ${err.message}\n`));
  proc.on('exit', (code, signal) => serverLogs.push(`server exited code=${code} signal=${signal}\n`));
  return proc;
}

async function waitForHealth(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not become healthy in time. Logs: ${serverLogs.join('').slice(-800)}`);
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
  serverProc = null;
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

// ---------- seed (directly into the throwaway DB) ----------
async function seed() {
  const { default: User } = await import('../src/models/User.js');
  const { default: Artisan } = await import('../src/models/Artisan.js');
  const { default: Product } = await import('../src/models/Product.js');
  const { default: GITag } = await import('../src/models/GITag.js');

  const [artisan1User, artisan2User, buyerUser, adminUser] = await User.create([
    { name: 'E2E Edit Artisan One', email: 'artisan1-edit@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Edit Artisan Two', email: 'artisan2-edit@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Edit Buyer', email: 'buyer-edit@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Edit Admin', email: 'admin-edit@e2e.test', password: 'Test@1234', role: 'ADMIN' }
  ]);

  const [a1, a2] = await Artisan.create([
    { user: artisan1User._id, businessName: 'E2E Edit Studio', description: 'Test weaver', craftTypes: ['textiles'], isVerified: true },
    { user: artisan2User._id, businessName: 'E2E Edit Pottery', description: 'Test potter', craftTypes: ['pottery'], isVerified: true }
  ]);

  const giTag = await GITag.create({
    name: 'E2E Kalamkari',
    type: 'textiles',
    description: 'Test GI description',
    location: { state: 'Telangana', district: 'Srikalahasti' },
    products: ['Saree'],
    isActive: true
  });

  const [p1, p2, p3, p4] = await Product.create([
    {
      name: 'E2E Kalamkari Saree',
      description: 'A hand-painted silk saree made with natural dyes.',
      price: 4500,
      category: 'textiles',
      craftType: 'Kalamkari',
      material: 'Mulberry silk',
      dimensions: { length: 550, width: 120, height: 2, unit: 'cm' },
      weight: 450,
      color: ['Indigo', 'Madder red'],
      stock: 7,
      tags: ['handloom', 'natural dye'],
      isCustomizable: true,
      customizationOptions: [{ name: 'Blouse piece', options: ['Yes', 'No'], additionalPrice: 0 }],
      giTag: giTag._id,
      artisan: a1._id,
      isActive: true,
      images: [
        'https://res.cloudinary.com/mockcloud/image/upload/v1/craftveda/products/p1-a.jpg',
        'https://res.cloudinary.com/mockcloud/image/upload/v1/craftveda/products/p1-b.jpg'
      ]
    },
    {
      name: 'E2E Hidden Durrie',
      description: 'A durrie that is switched off in the shop.',
      price: 1200,
      category: 'textiles',
      craftType: 'Handloom',
      stock: 2,
      artisan: a1._id,
      isActive: false,
      images: []
    },
    {
      name: 'E2E Foreign Vase',
      description: 'Belongs to the second artisan.',
      price: 999,
      category: 'pottery',
      craftType: 'Terracotta',
      stock: 3,
      artisan: a2._id,
      isActive: true,
      images: []
    },
    {
      name: 'E2E Edit Target',
      description: 'Original description before the edit.',
      price: 1500,
      category: 'textiles',
      craftType: 'Block Printing',
      stock: 5,
      artisan: a1._id,
      isActive: true,
      images: []
    }
  ]);

  return {
    ids: {
      a1: a1._id.toString(),
      giTag: giTag._id.toString(),
      p1: p1._id.toString(),
      p2: p2._id.toString(),
      p3: p3._id.toString(),
      p4: p4._id.toString()
    },
    creds: {
      artisan1: { email: 'artisan1-edit@e2e.test', password: 'Test@1234' },
      artisan2: { email: 'artisan2-edit@e2e.test', password: 'Test@1234' },
      buyer: { email: 'buyer-edit@e2e.test', password: 'Test@1234' },
      admin: { email: 'admin-edit@e2e.test', password: 'Test@1234' }
    }
  };
}

async function login(creds) {
  const { status, json } = await req('POST', '/auth/login', { body: creds });
  assert(status === 200 && json?.token, `login failed (${status})`);
  return json.token;
}

const newObjectId = () => new mongoose.Types.ObjectId().toString();

// ---------- the tests ----------
async function runTests(seedData) {
  const { ids, creds } = seedData;
  const tA1 = await login(creds.artisan1);
  const tA2 = await login(creds.artisan2);
  const tBuyer = await login(creds.buyer);
  const tAdmin = await login(creds.admin);

  // ================= GET /products/mine/:id =================
  await check('GET /products/mine/:id — owner reads their own product -> 200', async () => {
    const { status, json } = await req('GET', `/products/mine/${ids.p1}`, { token: tA1 });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.product?._id === ids.p1, 'wrong product returned');
    assert(json.product.name === 'E2E Kalamkari Saree', `name=${json.product.name}`);
  });

  await check('GET /products/mine/:id — owner reads an inactive product -> 200', async () => {
    const { status, json } = await req('GET', `/products/mine/${ids.p2}`, { token: tA1 });
    assert(status === 200, `got ${status}`);
    assert(json.product?.isActive === false, 'inactive product not returned as-is');
  });

  await check('GET /products/mine/:id — malformed id -> 404', async () => {
    const { status } = await req('GET', '/products/mine/not-an-id', { token: tA1 });
    assert(status === 404, `got ${status}`);
  });

  await check('GET /products/mine/:id — unknown id -> 404', async () => {
    const { status, json } = await req('GET', `/products/mine/${newObjectId()}`, { token: tA1 });
    assert(status === 404, `got ${status}`);
    assert(/not found/i.test(json?.message || ''), `message: ${json?.message}`);
  });

  await check('GET /products/mine/:id — another artisan -> 403', async () => {
    const { status, json } = await req('GET', `/products/mine/${ids.p1}`, { token: tA2 });
    assert(status === 403, `got ${status}`);
    assert(/own products/i.test(json?.message || ''), `message: ${json?.message}`);
  });

  await check('GET /products/mine/:id — no token -> 401', async () => {
    const { status } = await req('GET', `/products/mine/${ids.p1}`);
    assert(status === 401, `got ${status}`);
  });

  await check('GET /products/mine/:id — customer -> 403', async () => {
    const { status } = await req('GET', `/products/mine/${ids.p1}`, { token: tBuyer });
    assert(status === 403, `got ${status}`);
  });

  await check('GET /products/mine/:id — admin (no artisan profile) -> 403', async () => {
    const { status, json } = await req('GET', `/products/mine/${ids.p1}`, { token: tAdmin });
    assert(status === 403, `got ${status}`);
    assert(/artisan profile/i.test(json?.message || ''), `message: ${json?.message}`);
  });

  // ================= POST /products/:id/duplicate =================
  let copyId = null;

  await check('POST /products/:id/duplicate — owner duplicates -> 201 "Copy of …"', async () => {
    const { status, json } = await req('POST', `/products/${ids.p1}/duplicate`, { token: tA1 });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
    const copy = json.product;
    assert(copy._id !== ids.p1, 'copy reuses the source id');
    assert(copy.name === 'Copy of E2E Kalamkari Saree', `name=${copy.name}`);
    copyId = copy._id;
  });

  await check('duplicate starts hidden and carries no images', async () => {
    const { status, json } = await req('GET', `/products/mine/${copyId}`, { token: tA1 });
    assert(status === 200, `got ${status}`);
    const copy = json.product;
    assert(copy.isActive === false, 'copy must be inactive');
    assert(Array.isArray(copy.images) && copy.images.length === 0, `images=${JSON.stringify(copy.images)}`);
  });

  await check('duplicate keeps every detail of the source', async () => {
    const { json } = await req('GET', `/products/mine/${ids.p1}`, { token: tA1 });
    const source = json.product;
    const { json: copyJson } = await req('GET', `/products/mine/${copyId}`, { token: tA1 });
    const copy = copyJson.product;

    assert(copy.price === source.price, `price ${copy.price} != ${source.price}`);
    assert(copy.category === source.category, 'category differs');
    assert(copy.craftType === source.craftType, 'craftType differs');
    assert(copy.material === source.material, 'material differs');
    assert(copy.stock === source.stock, 'stock differs');
    assert(copy.weight === source.weight, 'weight differs');
    assert(String(copy.giTag?._id ?? copy.giTag) === String(source.giTag?._id ?? source.giTag), 'giTag differs');
    assert(String(copy.artisan) === String(source.artisan), 'artisan differs');
    assert(copy.isCustomizable === source.isCustomizable, 'isCustomizable differs');
    assert(JSON.stringify(copy.color) === JSON.stringify(source.color), 'color differs');
    assert(JSON.stringify(copy.tags) === JSON.stringify(source.tags), 'tags differs');
    assert(JSON.stringify(copy.dimensions) === JSON.stringify(source.dimensions), 'dimensions differ');
    assert(
      JSON.stringify(copy.customizationOptions) === JSON.stringify(source.customizationOptions),
      'customizationOptions differ'
    );
  });

  await check('duplicate is readable by its owner through GET /products/mine/:id', async () => {
    const { status, json } = await req('GET', `/products/mine/${copyId}`, { token: tA1 });
    assert(status === 200 && json.product?._id === copyId, `got ${status}`);
  });

  await check('duplicate is hidden from the public shop list', async () => {
    const { status, json } = await req('GET', '/products', {});
    assert(status === 200, `got ${status}`);
    const found = (json.products || []).some((p) => p._id === copyId);
    assert(!found, 'inactive copy leaked into the public list');
  });

  await check('duplicate shows up in GET /products/mine', async () => {
    const { status, json } = await req('GET', '/products/mine', { token: tA1 });
    assert(status === 200, `got ${status}`);
    const found = (json.products || []).some((p) => p._id === copyId);
    assert(found, 'copy missing from the artisan list');
  });

  await check('duplicate of an inactive product -> 201 and still inactive', async () => {
    const { status, json } = await req('POST', `/products/${ids.p2}/duplicate`, { token: tA1 });
    assert(status === 201, `got ${status}`);
    assert(json.product.name === 'Copy of E2E Hidden Durrie', `name=${json.product.name}`);
    assert(json.product.isActive === false, 'copy must stay inactive');
  });

  await check('duplicate another artisan\'s product -> 403', async () => {
    const { status } = await req('POST', `/products/${ids.p1}/duplicate`, { token: tA2 });
    assert(status === 403, `got ${status}`);
  });

  await check('duplicate without token -> 401', async () => {
    const { status } = await req('POST', `/products/${ids.p1}/duplicate`);
    assert(status === 401, `got ${status}`);
  });

  await check('duplicate as a customer -> 403', async () => {
    const { status } = await req('POST', `/products/${ids.p1}/duplicate`, { token: tBuyer });
    assert(status === 403, `got ${status}`);
  });

  await check('duplicate an unknown id -> 404', async () => {
    const { status } = await req('POST', `/products/${newObjectId()}/duplicate`, { token: tA1 });
    assert(status === 404, `got ${status}`);
  });

  await check('admin duplicates an artisan\'s product -> 201, owner unchanged', async () => {
    const { status, json } = await req('POST', `/products/${ids.p4}/duplicate`, { token: tAdmin });
    assert(status === 201, `got ${status}`);
    assert(String(json.product.artisan) === ids.a1, `artisan=${json.product.artisan}`);
    assert(json.product.name === 'Copy of E2E Edit Target', `name=${json.product.name}`);
  });

  // ================= PUT /products/:id (edit page payload) =================
  const editPayload = {
    name: 'E2E Edit Target Renamed',
    description: 'A rewritten description that carries the full story of the piece.',
    price: 799,
    category: 'pottery',
    craftType: 'Terracotta',
    material: 'River clay',
    stock: 4,
    color: ['Rust', 'Sand'],
    tags: ['terracotta', 'handmade'],
    isCustomizable: false,
    giTag: null,
    weight: 320,
    dimensions: { length: 20, width: 20, height: 30, unit: 'cm' },
    customizationOptions: []
  };

  await check('PUT /products/:id — full edit payload -> 200 and every field saved', async () => {
    const { status, json } = await req('PUT', `/products/${ids.p4}`, { token: tA1, body: editPayload });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    const saved = json.product;
    assert(saved.name === editPayload.name, `name=${saved.name}`);
    assert(saved.description === editPayload.description, 'description not saved');
    assert(saved.price === 799, `price=${saved.price}`);
    assert(saved.category === 'pottery', `category=${saved.category}`);
    assert(saved.craftType === 'Terracotta', `craftType=${saved.craftType}`);
    assert(saved.material === 'River clay', `material=${saved.material}`);
    assert(saved.stock === 4, `stock=${saved.stock}`);
    assert(saved.weight === 320, `weight=${saved.weight}`);
    assert(JSON.stringify(saved.color) === JSON.stringify(['Rust', 'Sand']), `color=${JSON.stringify(saved.color)}`);
    assert(JSON.stringify(saved.tags) === JSON.stringify(['terracotta', 'handmade']), `tags=${JSON.stringify(saved.tags)}`);
    assert(saved.dimensions?.length === 20 && saved.dimensions?.height === 30 && saved.dimensions?.unit === 'cm',
      `dimensions=${JSON.stringify(saved.dimensions)}`);
    assert(saved.isCustomizable === false, 'isCustomizable not saved');
    assert(saved.giTag == null, `giTag=${saved.giTag}`);
  });

  await check('PUT /products/:id — clearing optional fields with null/[] -> 200', async () => {
    const { status, json } = await req('PUT', `/products/${ids.p4}`, {
      token: tA1,
      body: { ...editPayload, material: null, weight: null, dimensions: { length: null, width: null, height: null, unit: 'cm' }, color: [], tags: [] }
    });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    const saved = json.product;
    assert(saved.material == null, `material=${saved.material}`);
    assert(saved.weight == null, `weight=${saved.weight}`);
    assert(saved.dimensions?.length == null, `dimensions.length=${saved.dimensions?.length}`);
    assert(JSON.stringify(saved.color) === '[]', `color=${JSON.stringify(saved.color)}`);
    assert(JSON.stringify(saved.tags) === '[]', `tags=${JSON.stringify(saved.tags)}`);
  });

  await check('PUT /products/:id — price of 0 -> 400', async () => {
    const { status, json } = await req('PUT', `/products/${ids.p4}`, {
      token: tA1,
      body: { ...editPayload, price: 0 }
    });
    assert(status === 400, `got ${status}`);
    const msg = json?.errors?.[0]?.msg || json?.message || '';
    assert(/greater than 0/i.test(msg), `message: ${msg}`);
  });

  await check('PUT /products/:id — negative stock -> 400', async () => {
    const { status, json } = await req('PUT', `/products/${ids.p4}`, {
      token: tA1,
      body: { ...editPayload, stock: -1 }
    });
    assert(status === 400, `got ${status}`);
    const msg = json?.errors?.[0]?.msg || json?.message || '';
    assert(/integer/i.test(msg), `message: ${msg}`);
  });

  await check('PUT /products/:id — another artisan -> 403', async () => {
    const { status } = await req('PUT', `/products/${ids.p4}`, { token: tA2, body: editPayload });
    assert(status === 403, `got ${status}`);
  });

  await check('PATCH /products/:id — show/hide round trip -> 200', async () => {
    const hidden = await req('PATCH', `/products/${ids.p4}`, { token: tA1, body: { isActive: false } });
    assert(hidden.status === 200 && hidden.json.product.isActive === false, `hide got ${hidden.status}`);
    const shown = await req('PATCH', `/products/${ids.p4}`, { token: tA1, body: { isActive: true } });
    assert(shown.status === 200 && shown.json.product.isActive === true, `show got ${shown.status}`);
  });
}

// ---------- main ----------
async function main() {
  console.log(`Step 11 product-edit E2E — db=${TEST_DB}, port=${PORT}, timeout=${TEST_TIMEOUT_MS / 1000}s`);

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
