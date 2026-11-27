/**
 * Preset consistency test — run with:  node tests/imagePresets.test.mjs
 *
 * Guards the single-source-of-truth contract:
 *  1. the exact preset transform strings in shared/imagePresets.js
 *  2. URL building (shared + frontend wrapper) produces those strings verbatim
 *  3. incoming upload transform + eager list stay in sync with the presets
 *  4. every preset referenced anywhere in the frontend exists (typo guard)
 *  5. no file outside shared/ hand-builds a transform string
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  IMAGE_PRESETS,
  PRESET_NAMES,
  EAGER_TRANSFORMS,
  ORIGINAL_CAP_TRANSFORM,
  incomingTransformParams,
  withTransform,
  presetUrl,
  srcsetAttr,
  presetUrlsFor,
} from '../../shared/imagePresets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ok = (name) => console.log(`ok - ${name}`);

// --- 1. exact preset strings ------------------------------------------------
assert.deepEqual(PRESET_NAMES, [
  'card_360',
  'card_640',
  'detail_640',
  'detail_1000',
  'thumb_140',
  'lightbox_1600',
  'avatar_160',
]);
assert.equal(IMAGE_PRESETS.card_360.transform, 'f_auto,q_auto,w_360,h_450,c_fill');
assert.equal(IMAGE_PRESETS.card_640.transform, 'f_auto,q_auto,w_640,h_800,c_fill');
assert.equal(IMAGE_PRESETS.detail_640.transform, 'f_auto,q_auto,w_640,h_640,c_fill');
assert.equal(IMAGE_PRESETS.detail_1000.transform, 'f_auto,q_auto,w_1000,h_1000,c_fill');
assert.equal(IMAGE_PRESETS.thumb_140.transform, 'f_auto,q_auto,w_140,h_140,c_fill');
assert.equal(IMAGE_PRESETS.lightbox_1600.transform, 'f_auto,q_auto,w_1600,h_1600,c_limit');
assert.equal(IMAGE_PRESETS.avatar_160.transform, 'f_auto,q_auto,w_160,h_160,c_fill');
assert.equal(ORIGINAL_CAP_TRANSFORM, 'c_limit,w_1600,h_1600,q_auto');
ok('exact preset transform strings');

// --- 2. URL building --------------------------------------------------------
const raw = 'https://res.cloudinary.com/demo/image/upload/v123/craftveda/products/a.jpg';
assert.equal(
  presetUrl(raw, 'card_640'),
  'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,h_800,c_fill/v123/craftveda/products/a.jpg'
);
// An existing transform segment is REPLACED, never merged.
const capped = presetUrl(
  'https://res.cloudinary.com/demo/image/upload/c_limit,w_1600,h_1600,q_auto/v1/a.jpg',
  'thumb_140'
);
assert.ok(capped.includes('/f_auto,q_auto,w_140,h_140,c_fill/v1/'), capped);
assert.ok(!capped.includes('c_limit'), capped);
// Non-Cloudinary URLs pass through untouched.
assert.equal(withTransform('https://example.com/x.png', 'w_10'), 'https://example.com/x.png');
// srcset lists every preset in ascending width order.
const set = srcsetAttr(raw, ['card_360', 'card_640']);
assert.equal(
  set,
  `${presetUrl(raw, 'card_360')} 360w, ${presetUrl(raw, 'card_640')} 640w`
);
assert.equal(presetUrlsFor(raw).length, PRESET_NAMES.length);
ok('shared URL building (replace semantics, passthrough, srcset)');

// --- 3. upload transform + eager list --------------------------------------
assert.deepEqual(incomingTransformParams(ORIGINAL_CAP_TRANSFORM), {
  crop: 'limit',
  width: 1600,
  height: 1600,
  quality: 'auto',
});
assert.deepEqual([...EAGER_TRANSFORMS], PRESET_NAMES.map((n) => IMAGE_PRESETS[n].transform));
ok('incoming hash + eager list stay in sync with presets');

// --- 4. frontend wrapper agrees with shared --------------------------------
const { presetUrl: fePresetUrl, srcsetAttr: feSrcsetAttr, imgSrc, BLUR_PLACEHOLDER } =
  await import('../../frontend/src/utils/imageUrl.js');
assert.equal(fePresetUrl(raw, 'detail_640'), presetUrl(raw, 'detail_640'));
assert.equal(feSrcsetAttr(raw, ['detail_640', 'detail_1000']), srcsetAttr(raw, ['detail_640', 'detail_1000']));
assert.equal(imgSrc(raw, { w: 640, h: 800 }), 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,h_800,c_fill/v123/craftveda/products/a.jpg');
assert.ok(BLUR_PLACEHOLDER.startsWith('data:image/svg+xml'));
ok('frontend imageUrl.js matches shared');

// --- 5. every preset referenced in the frontend exists ----------------------
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
};

const frontendFiles = walk(path.join(root, 'frontend', 'src'));
const presetRefRe = /['"]((?:card|detail|thumb|lightbox|avatar)_\d+)['"]/g;
let refs = 0;
for (const file of frontendFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(presetRefRe)) {
    assert.ok(
      PRESET_NAMES.includes(match[1]),
      `${path.relative(root, file)} references unknown preset "${match[1]}"`
    );
    refs += 1;
  }
}
assert.ok(refs > 0, 'expected the frontend to reference presets');
ok(`all ${refs} frontend preset references exist`);

// --- 6. no transform strings are hand-built outside shared/ ----------------
const literal = /f_auto,q_auto|w_\d{3,4},h_\d{3,4},c_(fill|limit)/;
const offenders = [];
for (const dir of ['frontend/src', 'backend/src', 'backend/seed.js', 'backend/tests']) {
  const full = path.join(root, dir);
  const files = fs.statSync(full).isDirectory() ? walk(full) : [full];
  for (const file of files) {
    if (file.endsWith('imagePresets.test.mjs')) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (literal.test(text)) offenders.push(path.relative(root, file));
  }
}
assert.deepEqual(offenders, [], `hand-built transform strings in: ${offenders.join(', ')}`);
ok('no transform strings outside shared/imagePresets.js');

// --- 7. every upload path derives its incoming transform from shared/ --------
const seedText = fs.readFileSync(path.join(root, 'backend', 'seed.js'), 'utf8');
assert.ok(
  seedText.includes('SEED_CAP_TRANSFORM') && seedText.includes('transformation: SEED_TRANSFORMATION'),
  'seed.js must upload its SVG artwork with SEED_CAP_TRANSFORM (shared/imagePresets.js)'
);
const imagesText = fs.readFileSync(path.join(root, 'backend', 'src', 'utils', 'images.js'), 'utf8');
assert.ok(
  imagesText.includes('incomingTransformParams(ORIGINAL_CAP_TRANSFORM)'),
  'images.js must derive the incoming upload transform from shared/imagePresets.js'
);
ok('upload transforms come from shared/imagePresets.js');

console.log('All image preset checks passed.');
