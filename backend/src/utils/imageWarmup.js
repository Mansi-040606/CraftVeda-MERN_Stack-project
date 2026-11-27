import { presetUrl, isCloudinaryImageUrl } from '../../../shared/imagePresets.js';

// A browser-like Accept header matters: f_auto picks the format from it, and a
// bot-style header would warm a DIFFERENT derived asset than the one the
// browser later asks for (defeating the whole warm pass).
const BROWSER_ACCEPT = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';

// Low enough to be polite, high enough that a full pass finishes quickly.
const DEFAULT_CONCURRENCY = 4;

// Which presets each stored asset is actually served with on the site.
// (Anything the frontend never requests is not worth a cache entry.)
export const WARM_PRESETS_BY_ROLE = Object.freeze({
  // product gallery/cards/detail/lightbox
  product: ['card_360', 'card_640', 'detail_640', 'detail_1000', 'thumb_140', 'lightbox_1600'],
  cover: ['lightbox_1600'],
  avatar: ['avatar_160'],
});

/**
 * Builds the full request list: one preset URL per (asset, preset) pair,
 * deduplicated (many products share nothing, but re-listed covers/avatars do).
 * @param {Array<{ url: string, role: keyof typeof WARM_PRESETS_BY_ROLE }>} assets
 * @returns {string[]}
 */
export const buildWarmUrls = (assets) => {
  const seen = new Set();
  for (const { url, role } of assets) {
    if (!isCloudinaryImageUrl(url)) continue;
    for (const name of WARM_PRESETS_BY_ROLE[role] || []) {
      seen.add(presetUrl(url, name));
    }
  }
  return [...seen];
};

/**
 * Requests every URL with a small worker pool.
 * @param {string[]} urls
 * @param {{concurrency?: number, onResult?: (r: {url: string, ms: number, ok: boolean, status: number}) => void}} [options]
 * @returns {Promise<{ total: number, ok: number, failed: number, ms: number, bytes: number }>}
 */
export const warmUrls = async (urls, { concurrency = DEFAULT_CONCURRENCY, onResult } = {}) => {
  const started = Date.now();
  const queue = [...urls];
  const stats = { total: urls.length, ok: 0, failed: 0, ms: 0, bytes: 0 };

  const worker = async () => {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      const t0 = Date.now();
      let ok = false;
      let status = 0;
      let bytes = 0;
      try {
        const res = await fetch(url, { headers: { accept: BROWSER_ACCEPT } });
        status = res.status;
        const buf = await res.arrayBuffer();
        bytes = buf.byteLength;
        ok = res.ok;
      } catch {
        ok = false;
      }
      const ms = Date.now() - t0;
      stats.ok += ok ? 1 : 0;
      stats.failed += ok ? 0 : 1;
      stats.bytes += bytes;
      onResult?.({ url, ms, ok, status });
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  stats.ms = Date.now() - started;
  return stats;
};
