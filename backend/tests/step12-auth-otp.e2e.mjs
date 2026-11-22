// Step 12 E2E — Google sign-in (ID-token verification MOCKED via
// GOOGLE_TOKEN_MOCK=1) and forgot-password with email OTP (mailer MOCKED:
// SMTP_* are blanked so the development fallback prints the code to the server
// console, and the test captures it from there — no real email, no real Google
// call, no network beyond localhost).
// Run from backend/: node tests/step12-auth-otp.e2e.mjs
// NEVER touches craftveda / craftveda_dev — hard-guarded below.
// Runs on a throwaway database and always stops the server + drops the DB.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEST_DB = 'craftveda_step12_test';
const MONGO_URI = `mongodb://localhost:27017/${TEST_DB}`;
const PORT = 5093;
const BASE = `http://127.0.0.1:${PORT}/api`;
const TEST_TIMEOUT_MS = 120_000;
const GOOGLE_CLIENT_ID = 'e2e-google-client-id';

const FORBIDDEN_DBS = ['craftveda', 'craftveda_dev'];
if (!MONGO_URI.endsWith(`/${TEST_DB}`) || FORBIDDEN_DBS.includes(TEST_DB)) {
  console.error('FATAL: refusing to run — unexpected DB');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

let serverProc = null;
const serverLogs = [];
const responseLog = [];

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  if (json !== null) responseLog.push(JSON.stringify(json));
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

// Blank the real secrets from backend/.env explicitly: dotenv never overwrites
// keys that already exist (even with ''), so this guarantees the test server
// uses the mock Google verifier and NEVER sends real mail.
function serverEnv() {
  return {
    ...process.env,
    PORT: String(PORT),
    MONGO_URI,
    NODE_ENV: 'test',
    GOOGLE_CLIENT_ID,
    GOOGLE_TOKEN_MOCK: '1',
    SMTP_HOST: '',
    SMTP_PORT: '',
    SMTP_USER: '',
    SMTP_PASS: '',
    MAIL_FROM: ''
  };
}

function startServer(envOverrides = {}) {
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: { ...serverEnv(), ...envOverrides },
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
    await sleep(250);
  }
  throw new Error(`Server did not become healthy in time. Logs: ${serverLogs.join('').slice(-800)}`);
}

async function waitForServerDown(timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await fetch(`${BASE}/health`); } catch { return; }
    await sleep(150);
  }
  throw new Error('Old server did not stop — port still answering');
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
  await sleep(400);
  try {
    const conn = await mongoose.createConnection(MONGO_URI).asPromise();
    if (conn.name === TEST_DB) await conn.dropDatabase();
    await conn.close();
    console.log(`\nCleanup: server stopped, database '${TEST_DB}' dropped.`);
  } catch (err) {
    console.error(`\nCleanup error: ${err.message}`);
  }
}

// ---------- OTP capture from the server console (mailer is mocked) ----------
const allLoggedOtps = () => {
  const text = serverLogs.join('');
  return [...text.matchAll(/\[mailer\] OTP for [^:]+: (\d{6})/g)].map((m) => m[1]);
};

async function waitForOtpCount(min, timeoutMs = 4_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = allLoggedOtps();
    if (found.length >= min) return found;
    await sleep(50);
  }
  return allLoggedOtps();
}

// Wait long enough that an UNEXPECTED send would have shown up in the logs.
async function expectNoNewOtp(mark, where) {
  await sleep(400);
  const found = allLoggedOtps();
  assert(found.length === mark, `expected no new OTP at ${where}, but ${found.length - mark} appeared`);
}

async function rewindCooldown(email) {
  // Tests move faster than the 60 s cooldown — rewind ONLY the last-sent
  // timestamp (never the hourly window) so the next send is allowed.
  await mongoose.connection.db.collection('users').updateOne(
    { email },
    { $set: { passwordResetOtpLastSentAt: new Date(Date.now() - 61_000) } }
  );
}

async function getUser(email) {
  return mongoose.connection.db.collection('users').findOne({ email });
}

// ---------- mock Google ID tokens (base64url JSON, checked like the real one) ----------
const googleToken = (payload) => Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const gPayload = (overrides = {}) => ({
  sub: 'g-sub-default',
  email: 'gdefault@e2e.test',
  email_verified: true,
  name: 'Google User',
  picture: 'https://example.com/avatar.jpg',
  aud: GOOGLE_CLIENT_ID,
  ...overrides
});

// ---------- seed (directly into the throwaway DB) ----------
async function seed() {
  const { default: User } = await import('../src/models/User.js');

  await User.create([
    { name: 'E2E Google Customer', email: 'google-existing@e2e.test', password: 'Test@1234', role: 'CUSTOMER', status: 'ACTIVE' },
    { name: 'E2E Google Artisan', email: 'google-artisan@e2e.test', password: 'Test@1234', role: 'ARTISAN', status: 'ACTIVE' },
    { name: 'E2E Google Blocked', email: 'google-blocked@e2e.test', password: 'Test@1234', role: 'CUSTOMER', status: 'BLOCKED' },
    { name: 'E2E Reset User', email: 'reset-user@e2e.test', password: 'Test@1234', role: 'CUSTOMER', status: 'ACTIVE' },
    { name: 'E2E Blocked Reset', email: 'blocked-reset@e2e.test', password: 'Test@1234', role: 'CUSTOMER', status: 'BLOCKED' }
  ]);
}

async function login(email, password) {
  return req('POST', '/auth/login', { body: { email, password } });
}

const RESET_EMAIL = 'reset-user@e2e.test';
const UNKNOWN_EMAIL = 'nobody-here@e2e.test';
const GENERIC_MESSAGE_SENTINEL = 'sent';

// ---------- the tests ----------
async function runTests() {
  // Reference shape: every Google response must match a normal login response.
  let loginShape = null;
  let genericMessage = null;
  let otp1 = null;
  let otp2 = null;
  let otp3 = null;
  let otp4 = null;
  let resetToken = null;

  // ================= POST /auth/google =================
  await check('login response shape (reference for Google responses)', async () => {
    const { status, json } = await login(RESET_EMAIL, 'Test@1234');
    assert(status === 200 && json?.token, `login failed (${status})`);
    loginShape = {
      top: Object.keys(json).sort().join(','),
      user: Object.keys(json.user).sort().join(',')
    };
  });

  await check('POST /auth/google — new user becomes CUSTOMER (role injection ignored)', async () => {
    const { status, json } = await req('POST', '/auth/google', {
      body: {
        credential: googleToken(gPayload({ sub: 'g-new-1', email: 'gnew@e2e.test', name: 'Google New User' })),
        role: 'ADMIN'
      }
    });
    assert(status === 200 && json?.token, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.success === true, 'success flag missing');
    assert(json.user.role === 'CUSTOMER', `role=${json.user.role} — must stay CUSTOMER`);
    assert(json.user.status === 'ACTIVE', `status=${json.user.status}`);
    assert(json.user.name === 'Google New User', `name=${json.user.name}`);
    assert(!('password' in json.user), 'password field leaked');
    assert(Object.keys(json).sort().join(',') === loginShape.top, 'top-level shape differs from login');
    assert(Object.keys(json.user).sort().join(',') === loginShape.user, 'user shape differs from login');

    const db = await getUser('gnew@e2e.test');
    assert(db, 'user not created');
    assert(db.role === 'CUSTOMER', `db role=${db.role}`);
    assert(db.status === 'ACTIVE', `db status=${db.status}`);
    assert(db.googleId === 'g-new-1', `googleId=${db.googleId}`);
    assert(db.avatar === 'https://example.com/avatar.jpg', 'avatar not saved');
    assert(String(db.password).startsWith('$2'), 'password not bcrypt-hashed');
    assert(String(db.password).length > 40, 'password too short to be random/unusable');
  });

  await check('POST /auth/google — existing customer keeps role and gains googleId', async () => {
    const { status, json } = await req('POST', '/auth/google', {
      body: { credential: googleToken(gPayload({ sub: 'g-sub-customer', email: 'google-existing@e2e.test', name: 'Existing Customer' })) }
    });
    assert(status === 200 && json?.token, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.user.role === 'CUSTOMER', `role=${json.user.role}`);
    const db = await getUser('google-existing@e2e.test');
    assert(db.googleId === 'g-sub-customer', `googleId=${db.googleId}`);
    assert(String(db.password).startsWith('$2'), 'password was replaced by Google login');
  });

  await check('POST /auth/google — second sign-in with the same googleId -> 200', async () => {
    const { status, json } = await req('POST', '/auth/google', {
      body: { credential: googleToken(gPayload({ sub: 'g-sub-customer', email: 'google-existing@e2e.test' })) }
    });
    assert(status === 200 && json?.token, `got ${status}`);
    assert(json.user.role === 'CUSTOMER', `role=${json.user.role}`);
  });

  await check('Google-linked user can still sign in with their password', async () => {
    const { status, json } = await login('google-existing@e2e.test', 'Test@1234');
    assert(status === 200 && json?.token, `password login broke (${status})`);
  });

  await check('POST /auth/google — existing ARTISAN keeps the ARTISAN role', async () => {
    const { status, json } = await req('POST', '/auth/google', {
      body: { credential: googleToken(gPayload({ sub: 'g-sub-artisan', email: 'google-artisan@e2e.test', name: 'Artisan Person' })) }
    });
    assert(status === 200 && json?.token, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.user.role === 'ARTISAN', `role=${json.user.role} — must never change`);
    const db = await getUser('google-artisan@e2e.test');
    assert(db.role === 'ARTISAN', `db role=${db.role}`);
    assert(db.googleId === 'g-sub-artisan', `googleId=${db.googleId}`);
  });

  await check('POST /auth/google — BLOCKED user -> 403 "Account is blocked" (same as password login)', async () => {
    const pwd = await login('google-blocked@e2e.test', 'Test@1234');
    assert(pwd.status === 403 && /blocked/i.test(pwd.json?.message || ''), `password login: ${pwd.status} ${pwd.json?.message}`);

    const { status, json } = await req('POST', '/auth/google', {
      body: { credential: googleToken(gPayload({ sub: 'g-sub-blocked', email: 'google-blocked@e2e.test' })) }
    });
    assert(status === 403, `got ${status}`);
    assert(json.message === pwd.json.message, `messages differ: "${json.message}" vs "${pwd.json.message}"`);
    const db = await getUser('google-blocked@e2e.test');
    assert(!db.googleId, 'googleId stored for a blocked account');
  });

  await check('POST /auth/google — unverified email -> 401', async () => {
    const { status, json } = await req('POST', '/auth/google', {
      body: { credential: googleToken(gPayload({ sub: 'g-unverified', email: 'unverified@e2e.test', email_verified: false })) }
    });
    assert(status === 401, `got ${status}`);
    assert(/not verified/i.test(json.message), `message: ${json.message}`);
    assert(!(await getUser('unverified@e2e.test')), 'user created from an unverified email');
  });

  await check('POST /auth/google — garbage credential -> 401', async () => {
    const { status } = await req('POST', '/auth/google', { body: { credential: 'not-a-google-token' } });
    assert(status === 401, `got ${status}`);
  });

  await check('POST /auth/google — credential for a different audience -> 401', async () => {
    const { status } = await req('POST', '/auth/google', {
      body: { credential: googleToken(gPayload({ sub: 'g-other-aud', email: 'otheraud@e2e.test', aud: 'someone-elses-client-id' })) }
    });
    assert(status === 401, `got ${status}`);
    assert(!(await getUser('otheraud@e2e.test')), 'user created despite audience mismatch');
  });

  await check('POST /auth/google — missing credential -> 400 validation', async () => {
    const { status, json } = await req('POST', '/auth/google', { body: {} });
    assert(status === 400, `got ${status}`);
    assert(json?.errors?.length || /credential/i.test(json?.message || ''), `body: ${JSON.stringify(json)}`);
  });

  // ================= POST /auth/forgot-password =================
  await check('forgot-password — unknown email: generic success, no account created', async () => {
    const mark = allLoggedOtps().length;
    const { status, json } = await req('POST', '/auth/forgot-password', { body: { email: UNKNOWN_EMAIL } });
    assert(status === 200, `got ${status}`);
    assert(json.success === true, 'success flag missing');
    assert(typeof json.message === 'string' && json.message.includes(GENERIC_MESSAGE_SENTINEL), `message: ${json.message}`);
    genericMessage = json.message;
    await expectNoNewOtp(mark, 'unknown email');
    assert(!(await getUser(UNKNOWN_EMAIL)), 'user created for unknown email');
  });

  await check('forgot-password — known email: IDENTICAL generic message + code issued', async () => {
    const mark = allLoggedOtps().length;
    const { status, json } = await req('POST', '/auth/forgot-password', { body: { email: RESET_EMAIL } });
    assert(status === 200, `got ${status}`);
    assert(json.message === genericMessage, `message differs for known email: ${json.message}`);
    const otps = await waitForOtpCount(mark + 1);
    assert(otps.length === mark + 1, 'no OTP was printed by the mailer');
    otp1 = otps[otps.length - 1];
    assert(/^\d{6}$/.test(otp1), `otp=${otp1}`);

    const doc = await getUser(RESET_EMAIL);
    assert(doc.passwordResetOtpRequestCount === 1, `requestCount=${doc.passwordResetOtpRequestCount}, expected 1`);
  });

  await check('OTP is never stored in plain text (only a 64-hex HMAC)', async () => {
    const doc = await getUser(RESET_EMAIL);
    assert(doc, 'user missing');
    assert(typeof doc.passwordResetOtpHash === 'string' && /^[0-9a-f]{64}$/.test(doc.passwordResetOtpHash),
      `hash missing/invalid: ${doc.passwordResetOtpHash}`);
    assert(doc.passwordResetOtpHash !== otp1, 'stored hash equals the OTP');
    // no field of the document may hold the plain code as its value
    const values = Object.values(doc).map((v) =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
    );
    assert(!values.includes(otp1), 'plain OTP stored as a field value');
    assert(!values.includes(`OTP for ${RESET_EMAIL}: ${otp1}`), 'OTP text stored verbatim');
    assert(String(doc.password).startsWith('$2'), 'password not bcrypt-hashed');
  });

  await check('resend cooldown — second request inside 60 s sends nothing (still generic 200)', async () => {
    const mark = allLoggedOtps().length;
    const before = await getUser(RESET_EMAIL);
    const { status, json } = await req('POST', '/auth/forgot-password', { body: { email: RESET_EMAIL } });
    assert(status === 200 && json.message === genericMessage, `not generic: ${status} ${json.message}`);
    await expectNoNewOtp(mark, 'cooldown');
    const after = await getUser(RESET_EMAIL);
    assert(String(after.passwordResetOtpLastSentAt) === String(before.passwordResetOtpLastSentAt),
      'lastSentAt changed during cooldown');
    assert(after.passwordResetOtpHash === before.passwordResetOtpHash, 'hash changed during cooldown');
  });

  await check('resend after the cooldown issues a fresh code', async () => {
    await rewindCooldown(RESET_EMAIL);
    const mark = allLoggedOtps().length;
    const { status } = await req('POST', '/auth/forgot-password', { body: { email: RESET_EMAIL } });
    assert(status === 200, `got ${status}`);
    const otps = await waitForOtpCount(mark + 1);
    assert(otps.length === mark + 1, 'resend did not produce a new OTP');
    otp2 = otps[otps.length - 1];
  });

  await check('verify-otp — 5 wrong codes count attempts and invalidate the OTP', async () => {
    for (let i = 1; i <= 5; i++) {
      const wrong = String((Number(otp2) + i) % 1_000_000).padStart(6, '0');
      const { status, json } = await req('POST', '/auth/verify-otp', { body: { email: RESET_EMAIL, otp: wrong } });
      assert(status === 400, `attempt ${i}: got ${status}`);
      assert(/invalid or expired/i.test(json.message), `attempt ${i}: ${json.message}`);
      const doc = await getUser(RESET_EMAIL);
      assert(doc.passwordResetOtpAttempts === i, `attempts=${doc.passwordResetOtpAttempts}, expected ${i}`);
    }
    const doc = await getUser(RESET_EMAIL);
    assert(new Date(doc.passwordResetOtpExpires).getTime() <= Date.now(), 'OTP not invalidated after 5 wrong attempts');
  });

  await check('verify-otp — locked: even the CORRECT code is rejected', async () => {
    const { status, json } = await req('POST', '/auth/verify-otp', { body: { email: RESET_EMAIL, otp: otp2 } });
    assert(status === 400, `got ${status}`);
    assert(/invalid or expired/i.test(json.message), `message: ${json.message}`);
    assert(!json.resetToken, 'reset token issued for a locked OTP');
  });

  await check('verify-otp — correct code returns a single-use reset token (hash stored, never the code)', async () => {
    await rewindCooldown(RESET_EMAIL);
    const mark = allLoggedOtps().length;
    await req('POST', '/auth/forgot-password', { body: { email: RESET_EMAIL } });
    const otps = await waitForOtpCount(mark + 1);
    otp3 = otps[otps.length - 1];

    const { status, json } = await req('POST', '/auth/verify-otp', { body: { email: RESET_EMAIL, otp: otp3 } });
    assert(status === 200 && json?.resetToken, `got ${status}: ${JSON.stringify(json)}`);
    assert(json.resetToken.length >= 32, 'reset token too short');
    resetToken = json.resetToken;

    const doc = await getUser(RESET_EMAIL);
    assert(!doc.passwordResetOtpHash, 'OTP hash not consumed after success');
    assert(doc.resetPasswordToken && doc.resetPasswordToken !== resetToken,
      'reset token stored in plain text');
    assert(/^[0-9a-f]{64}$/.test(doc.resetPasswordToken), `reset token hash invalid: ${doc.resetPasswordToken}`);
    assert(!JSON.stringify(json).includes(otp3), 'OTP leaked in verify response');
    assert(!JSON.stringify(json).includes('passwordResetOtpHash'), 'OTP hash field leaked in verify response');
  });

  await check('reset-password — wrong token -> 400', async () => {
    const { status } = await req('POST', '/auth/reset-password', {
      body: { email: RESET_EMAIL, resetToken: 'f'.repeat(64), newPassword: 'Whatever@123' }
    });
    assert(status === 400, `got ${status}`);
  });

  await check('reset-password — success clears every OTP/reset field', async () => {
    const { status, json } = await req('POST', '/auth/reset-password', {
      body: { email: RESET_EMAIL, resetToken, newPassword: 'BrandNew@123' }
    });
    assert(status === 200 && json?.success, `got ${status}: ${JSON.stringify(json)}`);
    const doc = await getUser(RESET_EMAIL);
    assert(!doc.resetPasswordToken, 'resetPasswordToken not cleared');
    assert(!doc.resetPasswordExpire, 'resetPasswordExpire not cleared');
    assert(!doc.passwordResetOtpHash, 'passwordResetOtpHash not cleared');
    assert(!doc.passwordResetOtpExpires, 'passwordResetOtpExpires not cleared');
    assert(doc.passwordResetOtpAttempts === undefined, 'passwordResetOtpAttempts not cleared');
    assert(doc.passwordResetOtpLastSentAt === undefined, 'passwordResetOtpLastSentAt not cleared');
    assert(doc.passwordResetOtpWindowStart === undefined, 'passwordResetOtpWindowStart not cleared');
    assert(doc.passwordResetOtpRequestCount === undefined, 'passwordResetOtpRequestCount not cleared');
  });

  await check('reset-password — the same token cannot be reused -> 400', async () => {
    const { status, json } = await req('POST', '/auth/reset-password', {
      body: { email: RESET_EMAIL, resetToken, newPassword: 'Another@1234' }
    });
    assert(status === 400, `got ${status}`);
    assert(/invalid or (has )?expired/i.test(json.message), `message: ${json.message}`);
    // password must NOT have changed by the failed reuse
    const { status: ok, json: okJson } = await login(RESET_EMAIL, 'BrandNew@123');
    assert(ok === 200 && okJson?.token, 'original new password no longer works');
  });

  await check('login with the NEW password works; the OLD one fails', async () => {
    const old = await login(RESET_EMAIL, 'Test@1234');
    assert(old.status === 401, `old password got ${old.status}`);
    const fresh = await login(RESET_EMAIL, 'BrandNew@123');
    assert(fresh.status === 200 && fresh.json?.token, `new password got ${fresh.status}`);
  });

  await check('expired OTP is rejected', async () => {
    await rewindCooldown(RESET_EMAIL);
    const mark = allLoggedOtps().length;
    await req('POST', '/auth/forgot-password', { body: { email: RESET_EMAIL } });
    const otps = await waitForOtpCount(mark + 1);
    otp4 = otps[otps.length - 1];

    await mongoose.connection.db.collection('users').updateOne(
      { email: RESET_EMAIL },
      { $set: { passwordResetOtpExpires: new Date(Date.now() - 1_000) } }
    );
    const { status, json } = await req('POST', '/auth/verify-otp', { body: { email: RESET_EMAIL, otp: otp4 } });
    assert(status === 400, `got ${status}`);
    assert(/invalid or expired/i.test(json.message), `message: ${json.message}`);
    assert(!json.resetToken, 'reset token issued for an expired OTP');
  });

  await check('max 5 OTP requests per hour — 6th request sends nothing (still generic 200)', async () => {
    // The successful reset above cleared the window counters (all OTP fields
    // are wiped on purpose), so push this window to 4 of 5 — earlier checks
    // already proved the organic increments — then exercise both boundaries.
    await mongoose.connection.db.collection('users').updateOne(
      { email: RESET_EMAIL },
      { $set: { passwordResetOtpWindowStart: new Date(), passwordResetOtpRequestCount: 4 } }
    );

    await rewindCooldown(RESET_EMAIL);
    let mark = allLoggedOtps().length;
    await req('POST', '/auth/forgot-password', { body: { email: RESET_EMAIL } });
    let otps = await waitForOtpCount(mark + 1);
    assert(otps.length === mark + 1, '5th hourly code was not issued');
    let doc = await getUser(RESET_EMAIL);
    assert(doc.passwordResetOtpRequestCount === 5, `requestCount=${doc.passwordResetOtpRequestCount}, expected 5`);

    await rewindCooldown(RESET_EMAIL);
    mark = allLoggedOtps().length;
    const { status, json } = await req('POST', '/auth/forgot-password', { body: { email: RESET_EMAIL } });
    assert(status === 200 && json.message === genericMessage, `not generic: ${status} ${json.message}`);
    await expectNoNewOtp(mark, 'hourly cap');
    doc = await getUser(RESET_EMAIL);
    assert(doc.passwordResetOtpRequestCount === 5, `requestCount grew to ${doc.passwordResetOtpRequestCount} past the cap`);
  });

  await check('forgot-password — BLOCKED account: generic 200 and NO code sent', async () => {
    const mark = allLoggedOtps().length;
    const { status, json } = await req('POST', '/auth/forgot-password', { body: { email: 'blocked-reset@e2e.test' } });
    assert(status === 200 && json.message === genericMessage, `not generic: ${status} ${json.message}`);
    await expectNoNewOtp(mark, 'blocked account');
    const doc = await getUser('blocked-reset@e2e.test');
    assert(!doc.passwordResetOtpHash, 'OTP issued for a blocked account');
  });

  await check('Google-created user can set a password through forgot-password', async () => {
    const { status: gStatus, json: gJson } = await req('POST', '/auth/google', {
      body: { credential: googleToken(gPayload({ sub: 'g-reset-1', email: 'greset@e2e.test', name: 'Google Reset User' })) }
    });
    assert(gStatus === 200 && gJson?.token, `google signup failed (${gStatus})`);

    const mark = allLoggedOtps().length;
    await req('POST', '/auth/forgot-password', { body: { email: 'greset@e2e.test' } });
    const otps = await waitForOtpCount(mark + 1);
    const otp = otps[otps.length - 1];

    const { status: vStatus, json: vJson } = await req('POST', '/auth/verify-otp', { body: { email: 'greset@e2e.test', otp } });
    assert(vStatus === 200 && vJson?.resetToken, `verify failed (${vStatus}): ${JSON.stringify(vJson)}`);

    const { status: rStatus, json: rJson } = await req('POST', '/auth/reset-password', {
      body: { email: 'greset@e2e.test', resetToken: vJson.resetToken, newPassword: 'SetLater@123' }
    });
    assert(rStatus === 200 && rJson?.success, `reset failed (${rStatus}): ${JSON.stringify(rJson)}`);

    const { status: lStatus, json: lJson } = await login('greset@e2e.test', 'SetLater@123');
    assert(lStatus === 200 && lJson?.token, `login with the new password failed (${lStatus})`);
    assert(lJson.user.role === 'CUSTOMER', `role=${lJson.user.role}`);
  });

  await check('no OTP or hash ever appears in any response body', async () => {
    const otps = allLoggedOtps();
    assert(otps.length >= 6, `only ${otps.length} OTPs were captured`);
    for (const body of responseLog) {
      for (const code of otps) {
        assert(!body.includes(code), `OTP ${code} leaked in a response: ${body.slice(0, 200)}`);
      }
      assert(!body.includes('passwordResetOtpHash'), `otp hash field leaked: ${body.slice(0, 200)}`);
      assert(!body.includes('passwordResetOtpExpires'), `otp expiry leaked: ${body.slice(0, 200)}`);
    }
  });
}

// Phase B: same server, no GOOGLE_CLIENT_ID at all.
async function runMissingConfigTest() {
  await check('POST /auth/google — missing GOOGLE_CLIENT_ID -> 503 "not configured"', async () => {
    const { status, json } = await req('POST', '/auth/google', {
      body: { credential: googleToken(gPayload()) }
    });
    assert(status === 503, `got ${status}`);
    assert(/not configured/i.test(json.message), `message: ${json.message}`);
  });
}

// ---------- main ----------
async function main() {
  console.log(`Step 12 Google sign-in + OTP E2E — db=${TEST_DB}, port=${PORT}, timeout=${TEST_TIMEOUT_MS / 1000}s`);

  await assertPortFree();
  console.log(`Port ${PORT} is free.`);

  await dropTestDb();
  console.log(`Fresh database '${TEST_DB}' ready.`);

  serverProc = startServer();
  await waitForHealth();
  console.log('Test server is healthy (Google + mailer mocked).');

  await mongoose.connect(MONGO_URI);
  await seed();
  console.log('Seed data created.');

  await Promise.race([
    (async () => {
      await runTests();

      // Restart without GOOGLE_CLIENT_ID for the 503 case.
      stopServer();
      await waitForServerDown();
      serverProc = startServer({ GOOGLE_CLIENT_ID: '' });
      await waitForHealth();
      console.log('Second server started without GOOGLE_CLIENT_ID.');
      await runMissingConfigTest();
      stopServer();
      await waitForServerDown();
    })(),
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
