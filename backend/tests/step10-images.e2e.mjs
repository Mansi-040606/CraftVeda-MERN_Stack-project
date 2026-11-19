// Step 10 E2E — product / profile / avatar image uploads (Cloudinary MOCKED),
// on a throwaway database. Run from backend/: node tests/step10-images.e2e.mjs
// NEVER touches craftveda / craftveda_dev — hard-guarded below.
// CLOUDINARY_MOCK=1 replaces the transport, so no real upload ever happens.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DB = 'craftveda_step10_test';
const MONGO_URI = `mongodb://localhost:27017/${TEST_DB}`;
const PORT = 5095;
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

// ---------- multipart helpers ----------
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

const pngBytes = (size = 4096) => {
  const buf = Buffer.alloc(size);
  PNG_MAGIC.copy(buf);
  return buf;
};

const jpegBytes = (size = 4096) => {
  const buf = Buffer.alloc(size);
  JPEG_MAGIC.copy(buf);
  return buf;
};

async function uploadRequest(token, urlPath, { field = 'images', files = [] } = {}) {
  const form = new FormData();
  for (const file of files) {
    form.append(field, new Blob([file.buffer], { type: file.type }), file.name);
  }
  const res = await fetch(`${BASE}${urlPath}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
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

function serverEnv({ withCredentials }) {
  const env = {
    ...process.env,
    PORT: String(PORT),
    MONGO_URI,
    NODE_ENV: 'test',
    CLOUDINARY_MOCK: '1'
  };
  if (withCredentials) {
    // Fake values only — the mock transport never talks to Cloudinary.
    env.CLOUDINARY_CLOUD_NAME = 'mockcloud';
    env.CLOUDINARY_API_KEY = 'mock-key';
    env.CLOUDINARY_API_SECRET = 'mock-secret';
  } else {
    // Empty strings, not deletions: dotenv.config() would otherwise re-populate
    // them from backend/.env when the server boots.
    env.CLOUDINARY_CLOUD_NAME = '';
    env.CLOUDINARY_API_KEY = '';
    env.CLOUDINARY_API_SECRET = '';
  }
  return env;
}

function startServer({ withCredentials = true } = {}) {
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: serverEnv({ withCredentials }),
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

  const [artisan1User, artisan2User, buyerUser, adminUser] = await User.create([
    { name: 'E2E Image Artisan One', email: 'artisan1-images@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Image Artisan Two', email: 'artisan2-images@e2e.test', password: 'Test@1234', role: 'ARTISAN' },
    { name: 'E2E Image Buyer', email: 'buyer-images@e2e.test', password: 'Test@1234', role: 'CUSTOMER' },
    { name: 'E2E Image Admin', email: 'admin-images@e2e.test', password: 'Test@1234', role: 'ADMIN' }
  ]);

  const [a1, a2] = await Artisan.create([
    {
      user: artisan1User._id, businessName: 'E2E Handloom Studio', description: 'Test weaver',
      craftTypes: ['textiles'], isVerified: true
    },
    {
      user: artisan2User._id, businessName: 'E2E Pottery Studio', description: 'Test potter',
      craftTypes: ['pottery'], isVerified: true
    }
  ]);

  const [p1, p2, p3] = await Product.create([
    { name: 'E2E Silk Saree', description: 'A test saree', price: 500, category: 'textiles', craftType: 'Handloom', stock: 10, artisan: a1._id },
    { name: 'E2E Cotton Durrie', description: 'A test durrie', price: 300, category: 'textiles', craftType: 'Handloom', stock: 5, artisan: a1._id },
    { name: 'E2E Clay Vase', description: 'A test vase', price: 999, category: 'pottery', craftType: 'Terracotta', stock: 3, artisan: a2._id }
  ]);

  return {
    ids: {
      a1: a1._id.toString(),
      a2: a2._id.toString(),
      p1: p1._id.toString(),
      p2: p2._id.toString(),
      p3: p3._id.toString()
    },
    creds: {
      artisan1: { email: 'artisan1-images@e2e.test', password: 'Test@1234' },
      artisan2: { email: 'artisan2-images@e2e.test', password: 'Test@1234' },
      buyer: { email: 'buyer-images@e2e.test', password: 'Test@1234' },
      admin: { email: 'admin-images@e2e.test', password: 'Test@1234' }
    }
  };
}

async function login(creds) {
  const { status, json } = await req('POST', '/auth/login', { body: creds });
  assert(status === 200 && json?.token, `login failed (${status})`);
  return json.token;
}

const isCloudinaryUrl = (url) =>
  typeof url === 'string' && url.includes('/image/upload/') && url.includes('/craftveda/');

// ---------- the tests ----------
async function runTests(seedData) {
  const { ids, creds } = seedData;
  const tA1 = await login(creds.artisan1);
  const tA2 = await login(creds.artisan2);
  const tBuyer = await login(creds.buyer);
  const tAdmin = await login(creds.admin);

  let p1Images = [];

  await check('health endpoint responds', async () => {
    const { status, json } = await req('GET', '/health');
    assert(status === 200 && json.status === 'ok', `got ${status}`);
  });

  // ---- auth / ownership ----
  await check('upload without token -> 401', async () => {
    const { status } = await uploadRequest(null, `/products/${ids.p1}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'a.png' }]
    });
    assert(status === 401, `got ${status}`);
  });

  await check('another artisan uploading to my product -> 403', async () => {
    const { status } = await uploadRequest(tA2, `/products/${ids.p1}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'a.png' }]
    });
    assert(status === 403, `got ${status}`);
  });

  // ---- happy paths ----
  await check('single image upload -> 201 with a stored url', async () => {
    const { status, json } = await uploadRequest(tA1, `/products/${ids.p1}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'cover.png' }]
    });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
    const images = json.product.images;
    assert(images.length === 1, `expected 1 image, got ${images?.length}`);
    assert(isCloudinaryUrl(images[0]), `unexpected url ${images[0]}`);
    p1Images = images;
  });

  await check('two files in one request append (total 3)', async () => {
    const { status, json } = await uploadRequest(tA1, `/products/${ids.p1}/images`, {
      files: [
        { buffer: jpegBytes(), type: 'image/jpeg', name: 'detail.jpg' },
        { buffer: pngBytes(), type: 'image/png', name: 'side.png' }
      ]
    });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.product.images.length === 3, `expected 3, got ${json.product.images?.length}`);
    p1Images = json.product.images;
  });

  // ---- rejections ----
  await check('wrong declared type (text/plain) -> 400', async () => {
    const { status, json } = await uploadRequest(tA1, `/products/${ids.p1}/images`, {
      files: [{ buffer: Buffer.from('hello world'), type: 'text/plain', name: 'notes.txt' }]
    });
    assert(status === 400, `got ${status}`);
    assert(/JPG, PNG and WEBP/i.test(json?.message || ''), `message: ${json?.message}`);
  });

  await check('png mimetype with non-image content -> 400 (real mime checked)', async () => {
    const { status, json } = await uploadRequest(tA1, `/products/${ids.p1}/images`, {
      files: [{ buffer: Buffer.from('definitely not an image, just text'), type: 'image/png', name: 'fake.png' }]
    });
    assert(status === 400, `got ${status}`);
    assert(/JPG, PNG and WEBP/i.test(json?.message || ''), `message: ${json?.message}`);
  });

  await check('file larger than 2 MB -> 400', async () => {
    const { status, json } = await uploadRequest(tA1, `/products/${ids.p1}/images`, {
      files: [{ buffer: pngBytes(2 * 1024 * 1024 + 4096), type: 'image/png', name: 'huge.png' }]
    });
    assert(status === 400, `got ${status}`);
    assert(/2 MB/i.test(json?.message || ''), `message: ${json?.message}`);
  });

  // ---- cap of 6 ----
  await check('three more images fill the product to 6 -> 201', async () => {
    const { status, json } = await uploadRequest(tA1, `/products/${ids.p1}/images`, {
      files: [
        { buffer: pngBytes(), type: 'image/png', name: 'a.png' },
        { buffer: jpegBytes(), type: 'image/jpeg', name: 'b.jpg' },
        { buffer: pngBytes(), type: 'image/png', name: 'c.png' }
      ]
    });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.product.images.length === 6, `expected 6, got ${json.product.images?.length}`);
    p1Images = json.product.images;
  });

  await check('7th image -> 400', async () => {
    const { status, json } = await uploadRequest(tA1, `/products/${ids.p1}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'seventh.png' }]
    });
    assert(status === 400, `got ${status}`);
    assert(/at most 6/i.test(json?.message || ''), `message: ${json?.message}`);
  });

  // ---- reorder / delete ----
  await check('reorder: new order applied, first image = cover', async () => {
    const reordered = [...p1Images].reverse();
    const { status, json } = await req('PUT', `/products/${ids.p1}/images/order`, {
      token: tA1,
      body: { images: reordered }
    });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.product.images[0] === reordered[0], 'first image is not the new cover');
    assert(json.product.images.length === 6, `length=${json.product.images.length}`);
    p1Images = json.product.images;
  });

  await check('reorder with a foreign url -> 400', async () => {
    const { status } = await req('PUT', `/products/${ids.p1}/images/order`, {
      token: tA1,
      body: { images: ['https://res.cloudinary.com/mockcloud/image/upload/v1/other/evil.jpg'] }
    });
    assert(status === 400, `got ${status}`);
  });

  await check('delete one image -> 200 and removed from the product', async () => {
    const target = p1Images[0];
    const { status, json } = await req('DELETE', `/products/${ids.p1}/images`, {
      token: tA1,
      body: { url: target }
    });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.product.images.length === 5, `length=${json.product.images?.length}`);
    assert(!json.product.images.includes(target), 'deleted url is still present');
    p1Images = json.product.images;
  });

  await check('delete an unknown image url -> 404', async () => {
    const { status } = await req('DELETE', `/products/${ids.p1}/images`, {
      token: tA1,
      body: { url: 'https://res.cloudinary.com/mockcloud/image/upload/v1/craftveda/products/nope.jpg' }
    });
    assert(status === 404, `got ${status}`);
  });

  await check('customer cannot delete product images -> 403', async () => {
    const { status } = await req('DELETE', `/products/${ids.p1}/images`, {
      token: tBuyer,
      body: { url: p1Images[0] }
    });
    assert(status === 403, `got ${status}`);
  });

  // ---- profile / cover / avatar ----
  await check('artisan profile image upload -> 200 and stored on the profile', async () => {
    const { status, json } = await uploadRequest(tA1, '/artisans/me/profile-image', {
      field: 'image',
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'profile.png' }]
    });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(isCloudinaryUrl(json.artisan.profileImage), `got ${json.artisan.profileImage}`);

    const me = await req('GET', '/artisans/me', { token: tA1 });
    assert(isCloudinaryUrl(me.json?.artisan?.profileImage), 'profile image not readable from GET /artisans/me');
  });

  await check('artisan cover image upload -> 200 and stored on the profile', async () => {
    const { status, json } = await uploadRequest(tA1, '/artisans/me/cover-image', {
      field: 'image',
      files: [{ buffer: jpegBytes(), type: 'image/jpeg', name: 'cover.jpg' }]
    });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(isCloudinaryUrl(json.artisan.coverImage), `got ${json.artisan.coverImage}`);
  });

  await check('customer cannot set a profile image -> 403', async () => {
    const { status } = await uploadRequest(tBuyer, '/artisans/me/profile-image', {
      field: 'image',
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'profile.png' }]
    });
    assert(status === 403, `got ${status}`);
  });

  await check('any signed-in user can upload an avatar -> 200', async () => {
    const { status, json } = await uploadRequest(tBuyer, '/auth/avatar', {
      field: 'avatar',
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'me.png' }]
    });
    assert(status === 200, `got ${status}: ${JSON.stringify(json)}`);
    assert(isCloudinaryUrl(json.user?.avatar), `got ${json.user?.avatar}`);

    const me = await req('GET', '/auth/me', { token: tBuyer });
    assert(isCloudinaryUrl(me.json?.user?.avatar), 'avatar not readable from GET /auth/me');
  });

  await check('avatar upload without token -> 401', async () => {
    const { status } = await uploadRequest(null, '/auth/avatar', {
      field: 'avatar',
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'me.png' }]
    });
    assert(status === 401, `got ${status}`);
  });

  await check('admin can upload images to any product -> 201', async () => {
    const { status, json } = await uploadRequest(tAdmin, `/products/${ids.p3}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'admin.png' }]
    });
    assert(status === 201, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.product.images.length === 1, `length=${json.product.images?.length}`);
  });

  // ---- product delete cleans up ----
  await check('deleting a product removes it and its images -> 200', async () => {
    const before = await req('GET', `/products/${ids.p2}`, {});
    assert(before.status === 200, `setup failed: ${before.status}`);
    await uploadRequest(tA1, `/products/${ids.p2}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'gone.png' }]
    });

    const { status } = await req('DELETE', `/products/${ids.p2}`, { token: tA1 });
    assert(status === 200, `got ${status}`);

    const { default: Product } = await import('../src/models/Product.js');
    const doc = await Product.findById(ids.p2);
    assert(doc === null, 'product still exists after delete');
  });

  // ---- ownership scoping after the delete ----
  await check('second artisan still manages only their own product', async () => {
    const ok = await uploadRequest(tA2, `/products/${ids.p3}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'mine.png' }]
    });
    assert(ok.status === 201, `own product got ${ok.status}`);
    const foreign = await uploadRequest(tA2, `/products/${ids.p1}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'theirs.png' }]
    });
    assert(foreign.status === 403, `foreign product got ${foreign.status}`);
  });
}

// Without credentials every upload must fail with a clear 503.
async function runUnconfiguredTests(seedData) {
  const token = await login(seedData.creds.artisan1);

  const { default: Product } = await import('../src/models/Product.js');
  const product = await Product.findOne({ name: 'E2E Silk Saree' });
  assert(product, 'seed product missing for the 503 checks');

  await check('missing credentials: product image upload -> 503', async () => {
    const { status, json } = await uploadRequest(token, `/products/${product._id}/images`, {
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'a.png' }]
    });
    assert(status === 503, `got ${status}: ${JSON.stringify(json)}`);
    assert(/Image upload is not configured/i.test(json?.message || ''), `message: ${json?.message}`);
  });

  await check('missing credentials: avatar upload -> 503', async () => {
    const { status, json } = await uploadRequest(token, '/auth/avatar', {
      field: 'avatar',
      files: [{ buffer: pngBytes(), type: 'image/png', name: 'a.png' }]
    });
    assert(status === 503, `got ${status}: ${JSON.stringify(json)}`);
    assert(/Image upload is not configured/i.test(json?.message || ''), `message: ${json?.message}`);
  });
}

// ---------- main ----------
async function main() {
  console.log(`Step 10 image E2E — db=${TEST_DB}, port=${PORT}, timeout=${TEST_TIMEOUT_MS / 1000}s`);

  await assertPortFree();
  console.log(`Port ${PORT} is free.`);

  await dropTestDb();
  console.log(`Fresh database '${TEST_DB}' ready.`);

  serverProc = startServer({ withCredentials: true });
  await waitForHealth();
  console.log('Test server is healthy (Cloudinary mocked).');

  await mongoose.connect(MONGO_URI);
  const seedData = await seed();
  console.log('Seed data created.');

  await Promise.race([
    runTests(seedData),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tests timed out after ${TEST_TIMEOUT_MS / 1000}s`)), TEST_TIMEOUT_MS)
    )
  ]);

  // Restart without credentials for the 503 checks.
  console.log('\nRestarting the server WITHOUT Cloudinary credentials…');
  stopServer();
  await new Promise((r) => setTimeout(r, 600));
  await assertPortFree();
  serverProc = startServer({ withCredentials: false });
  await waitForHealth();
  await runUnconfiguredTests(seedData);
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
