/**
 * Cloudinary URL helpers.
 *
 * Product / artisan images are stored as plain Cloudinary `secure_url`
 * strings, and every size we deliver comes from ONE shared preset list:
 *
 *   shared/imagePresets.js   <- imported by BOTH the frontend and the backend
 *
 * The preset transform strings are used verbatim here and verbatim in the
 * backend's eager transformations (backend/src/utils/images.js), so a URL the
 * browser requests is byte-identical to the derived asset generated at upload
 * time / by warmImages.js. Cloudinary treats any deviation (even the order of
 * `w_` and `c_`) as a different image, so never build transform strings by
 * hand — use `presetUrl()` / `srcsetAttr()`.
 *
 * `imgSrc()` remains for the few non-preset surfaces (workshops, stories,
 * admin previews) that are not part of the warmed preset set.
 */

import {
  IMAGE_PRESETS,
  PRESET_NAMES,
  isCloudinaryImageUrl,
  withTransform as withSharedTransform,
  presetUrl,
  srcsetAttr,
} from '../../../shared/imagePresets.js';

export { IMAGE_PRESETS, PRESET_NAMES, presetUrl, srcsetAttr };

/** True when the URL is a Cloudinary image delivery URL. */
export function isCloudinaryUrl(url) {
  return isCloudinaryImageUrl(url);
}

/**
 * Insert a Cloudinary transform segment into an image URL (replaces any
 * transform already present — see shared/imagePresets.js).
 */
export function withTransform(url, transform) {
  return withSharedTransform(url, transform);
}

/**
 * Non-preset delivery for surfaces outside the shared preset set.
 * Prefer a preset wherever one fits — each unique transform is a distinct
 * Cloudinary cache entry.
 * @param {string|undefined|null} url stored URL
 * @param {{w?:number, h?:number, crop?:'fill'|'fit', dpr?:number}} box
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

/**
 * Tiny blurred wash shown behind an image while it loads (blur-up).
 * A few hundred bytes of inline SVG — no extra request, no layout shift.
 */
export const BLUR_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#EFE3D0"/>
          <stop offset="0.55" stop-color="#E3CDB6"/>
          <stop offset="1" stop-color="#D9BEA4"/>
        </linearGradient>
        <filter id="f"><feGaussianBlur stdDeviation="2.4"/></filter>
      </defs>
      <rect width="32" height="32" fill="url(#b)"/>
      <ellipse cx="10" cy="12" rx="12" ry="9" fill="#C9A183" opacity="0.55" filter="url(#f)"/>
      <ellipse cx="24" cy="24" rx="10" ry="8" fill="#B98F6E" opacity="0.45" filter="url(#f)"/>
    </svg>`
  );

export default imgSrc;
