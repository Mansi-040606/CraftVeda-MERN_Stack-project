/**
 * Cloudinary URL helpers.
 *
 * Product / artisan images are stored as plain Cloudinary `secure_url` strings.
 * Cloudinary supports on-the-fly delivery transforms in the URL itself, so we
 * can ask for a resized, auto-format, auto-quality copy without any upload-time
 * work — e.g. `.../image/upload/v123/foo.jpg` -> `.../image/upload/f_auto,q_auto,w_800/v123/foo.jpg`
 *
 * Non-Cloudinary URLs (local seed art, external, empty) pass through untouched.
 */

const CLOUDINARY_RE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

/** True when the URL is a Cloudinary image delivery URL. */
export function isCloudinaryUrl(url) {
  return typeof url === 'string' && CLOUDINARY_RE.test(url);
}

/**
 * Insert a Cloudinary transform segment into an image URL.
 * Handles URLs that already carry transforms (comma-separated) and keeps the
 * leading `v<version>` segment in place:
 *
 *   .../upload/v123/folder/a.jpg  ->  .../upload/f_auto,q_auto,w_640/v123/folder/a.jpg
 */
export function withTransform(url, transform) {
  if (!isCloudinaryUrl(url) || !transform) return url;
  const [base] = url.split(/[?#]/);
  const segments = base.split('/');
  const uploadIdx = segments.indexOf('upload');
  if (uploadIdx < 0) return url;

  const rest = segments.slice(uploadIdx + 1);

  // An existing transform is a comma-joined segment sitting before the version.
  let existing = null;
  if (rest.length > 1 && rest[0].includes(',')) existing = rest.shift();

  // The version segment (v123) always comes before the folder/file path.
  let version = null;
  if (rest.length && /^v\d+$/.test(rest[0])) version = rest.shift();

  const merged = existing ? `${existing},${transform}` : transform;

  return [
    ...segments.slice(0, uploadIdx + 1),
    merged,
    ...(version ? [version] : []),
    ...rest,
  ].join('/');
}

/**
 * Best image URL for a given display box.
 * @param {string|undefined|null} url stored URL
 * @param {{w?:number, h?:number, crop?:'fill'|'fit', dpr?:number}} box
 *   `crop: 'fill'` crops to exactly the box (default for fixed frames);
 *   `crop: 'fit'` only downscales, never crops.
 * @returns {string} URL safe to put in an <img src>
 */
export function imgSrc(url, { w, h, crop = 'fill', dpr } = {}) {
  if (!url) return '';
  const ops = ['f_auto', 'q_auto'];
  if (w) ops.push(`w_${Math.round(w * (dpr || 1))}`);
  if (h) ops.push(`h_${Math.round(h * (dpr || 1))}`);
  if (w || h) ops.push(`c_${crop}`);
  return withTransform(url, ops.join(','));
}

/** Placeholder used when there is no image at all. */
export const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
      <rect width="400" height="500" fill="#F2EADC"/>
      <g fill="none" stroke="#8A7563" stroke-width="2" opacity="0.7">
        <circle cx="200" cy="230" r="54"/>
        <path d="M120 330c30-40 60-60 80-60s50 20 80 60"/>
      </g>
      <text x="200" y="420" text-anchor="middle" font-family="Georgia, serif"
            font-size="20" fill="#8A7563">CraftVeda</text>
    </svg>`
  );

export default imgSrc;
