/**
 * CraftVeda Cloudinary image presets — the ONE list of delivery transforms.
 *
 * Both sides import this file:
 *   - frontend/src/utils/imageUrl.js  builds <img src>/<img srcset> URLs
 *   - backend/src/utils/images.js     sends them as eager transformations on upload
 *   - backend/src/scripts/warmImages.js pre-requests them for existing images
 *
 * Cloudinary creates a NEW derived asset for every distinct transformation
 * string, so the exact bytes matter: `w_640,h_800,c_fill` and
 * `c_fill,w_640,h_800` are two different cache entries (and two different
 * transformation-credit line items). Never hand-build these strings anywhere
 * else — add a preset here instead, and keep the set small.
 *
 * Widths on purpose (do not add more):
 *   card 360/640 (srcset 1x/2x) · detail 640/1000 (srcset) · thumb 140
 *   lightbox 1600 · avatar 160
 */

/** @typedef {{ transform: string, width: number, height: number }} ImagePreset */

/** @type {Readonly<Record<string, ImagePreset>>} */
export const IMAGE_PRESETS = Object.freeze({
  // Product cards (4:5 frame) — srcset pair, 1x/2x.
  card_360: Object.freeze({ transform: 'f_auto,q_auto,w_360,h_450,c_fill', width: 360, height: 450 }),
  card_640: Object.freeze({ transform: 'f_auto,q_auto,w_640,h_800,c_fill', width: 640, height: 800 }),
  // Detail gallery main frame (square) — srcset pair.
  detail_640: Object.freeze({ transform: 'f_auto,q_auto,w_640,h_640,c_fill', width: 640, height: 640 }),
  detail_1000: Object.freeze({ transform: 'f_auto,q_auto,w_1000,h_1000,c_fill', width: 1000, height: 1000 }),
  // Gallery thumbnail strip.
  thumb_140: Object.freeze({ transform: 'f_auto,q_auto,w_140,h_140,c_fill', width: 140, height: 140 }),
  // Full-screen lightbox (and wide cover strips): never upscaled, capped at 1600px.
  lightbox_1600: Object.freeze({ transform: 'f_auto,q_auto,w_1600,h_1600,c_limit', width: 1600, height: 1600 }),
  // Artisan/customer round portraits.
  avatar_160: Object.freeze({ transform: 'f_auto,q_auto,w_160,h_160,c_fill', width: 160, height: 160 }),
});

/** Preset names in a stable order (also the eager-generation order). */
export const PRESET_NAMES = Object.freeze(Object.keys(IMAGE_PRESETS));

/**
 * Every preset transform, exactly as Cloudinary must receive it on upload
 * (eager) and exactly as it must appear in a delivery URL.
 * @type {ReadonlyArray<string>}
 */
export const EAGER_TRANSFORMS = Object.freeze(
  PRESET_NAMES.map((name) => IMAGE_PRESETS[name].transform)
);

/**
 * Incoming transformation applied on upload: the stored original itself is
 * capped at 1600px on both sides (c_limit never upscales) and re-compressed
 * with q_auto, so no raw delivery URL can ever ship a huge file.
 */
export const ORIGINAL_CAP_TRANSFORM = 'c_limit,w_1600,h_1600,q_auto';

/**
 * Seed-only variant of the incoming cap: identical, plus f_jpg so the SVG seed
 * artwork rasterizes to a small JPEG on re-seed (default would be PNG).
 * NEVER used for real artisan/customer uploads — those keep the plain cap so
 * PNG transparency and original formats survive.
 */
export const SEED_CAP_TRANSFORM = `${ORIGINAL_CAP_TRANSFORM},f_jpg`;

/**
 * Cloudinary's upload API rejects the string form of an incoming
 * transformation through the Node SDK, but accepts the same components as a
 * hash. This converts `ORIGINAL_CAP_TRANSFORM` (or any component string) into
 * that hash, so the single string above stays the only definition.
 * @param {string} transform comma-separated `key_value` components
 * @returns {{crop?: string, width?: number, height?: number, quality?: string, format?: string}}
 */
export function incomingTransformParams(transform) {
  /** @type {Record<string, string|number>} */
  const params = {};
  for (const part of String(transform).split(',')) {
    const at = part.indexOf('_');
    if (at <= 0) throw new Error(`Malformed transformation component "${part}"`);
    const key = part.slice(0, at);
    const value = part.slice(at + 1);
    if (key === 'c') params.crop = value;
    else if (key === 'w') params.width = Number(value);
    else if (key === 'h') params.height = Number(value);
    else if (key === 'q') params.quality = value;
    else if (key === 'f') params.format = value;
    else throw new Error(`Unsupported incoming transformation component "${part}"`);
  }
  return params;
}

const CLOUDINARY_IMAGE_RE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

/** True when the URL is a Cloudinary image delivery URL. */
export const isCloudinaryImageUrl = (url) =>
  typeof url === 'string' && CLOUDINARY_IMAGE_RE.test(url);

/**
 * Insert a transformation segment into a Cloudinary image URL.
 *
 * Any transformation already present in the URL is REPLACED (never merged):
 * combining two transform strings would give Cloudinary conflicting width
 * qualifiers and mint a brand-new cache entry nobody warms.
 *
 *   .../upload/v123/folder/a.jpg
 *     -> .../upload/f_auto,q_auto,w_640,h_800,c_fill/v123/folder/a.jpg
 *   .../upload/c_limit,w_1600,h_1600,q_auto/v123/folder/a.jpg
 *     -> .../upload/f_auto,q_auto,w_640,h_800,c_fill/v123/folder/a.jpg
 */
export function withTransform(url, transform) {
  if (!isCloudinaryImageUrl(url) || !transform) return url;
  const [base] = url.split(/[?#]/);
  const segments = base.split('/');
  const uploadIdx = segments.indexOf('upload');
  if (uploadIdx < 0) return url;

  const rest = segments.slice(uploadIdx + 1);

  // An existing transform is a comma-joined segment sitting before the version.
  if (rest.length > 1 && rest[0].includes(',')) rest.shift();

  // The version segment (v123) always comes before the folder/file path.
  let version = null;
  if (rest.length && /^v\d+$/.test(rest[0])) version = rest.shift();

  return [
    ...segments.slice(0, uploadIdx + 1),
    transform,
    ...(version ? [version] : []),
    ...rest,
  ].join('/');
}

/**
 * Delivery URL for a named preset.
 * @param {string} url stored Cloudinary (or non-Cloudinary) URL
 * @param {string} name key of IMAGE_PRESETS
 */
export function presetUrl(url, name) {
  const preset = IMAGE_PRESETS[name];
  if (!preset) throw new Error(`Unknown image preset "${name}"`);
  return withTransform(url, preset.transform);
}

/**
 * `srcset` attribute value for one or more presets, e.g.
 * `...w_360... 360w, ...w_640... 640w`.
 * @param {string} url stored URL
 * @param {ReadonlyArray<string>} names preset names, ascending by width
 */
export function srcsetAttr(url, names) {
  return names
    .map((name) => {
      const preset = IMAGE_PRESETS[name];
      if (!preset) throw new Error(`Unknown image preset "${name}"`);
      return `${presetUrl(url, name)} ${preset.width}w`;
    })
    .join(', ');
}

/**
 * Every preset URL for one stored image — the exact set warmImages.js requests.
 * @param {string} url stored URL
 * @returns {string[]}
 */
export function presetUrlsFor(url) {
  return PRESET_NAMES.map((name) => presetUrl(url, name));
}
