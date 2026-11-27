import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Artisan from '../models/Artisan.js';
import { buildWarmUrls, warmUrls } from '../utils/imageWarmup.js';

// Pre-generates (and edge-caches) every preset the site will request for the
// images already in the database, so first visitors never pay Cloudinary's
// on-demand transformation cost. Safe to re-run any time: warm entries are
// simply re-served.
//
//   node src/scripts/warmImages.js           # warm everything
//   node src/scripts/warmImages.js --dry-run # print what would be warmed

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/craftveda';
const DRY_RUN = process.argv.includes('--dry-run');

const collectAssets = async () => {
  const assets = [];

  const products = await Product.find({ isActive: true })
    .select('images')
    .lean();
  for (const product of products) {
    for (const url of product.images || []) assets.push({ url, role: 'product' });
  }

  const artisans = await Artisan.find({}).select('profileImage coverImage').lean();
  for (const artisan of artisans) {
    if (artisan.coverImage) assets.push({ url: artisan.coverImage, role: 'cover' });
    if (artisan.profileImage) assets.push({ url: artisan.profileImage, role: 'avatar' });
  }

  return assets;
};

const run = async () => {
  await mongoose.connect(MONGO_URI);

  const assets = await collectAssets();
  const urls = buildWarmUrls(assets);
  console.log(
    `Found ${assets.length} image references; ${urls.length} preset URLs to warm.`
  );

  if (DRY_RUN) {
    await mongoose.connection.close();
    return;
  }
  if (urls.length === 0) {
    console.log('Nothing to warm.');
    await mongoose.connection.close();
    return;
  }

  console.log('Warming (concurrency 4, browser Accept header)...');
  let done = 0;
  const stats = await warmUrls(urls, {
    onResult: ({ ok, ms }) => {
      done += 1;
      if (!ok || done % 40 === 0 || done === urls.length) {
        console.log(
          `  ${done}/${urls.length} done${ok ? '' : ' — request failed'} (${ms} ms)`
        );
      }
    },
  });

  console.log(
    `Warmed ${stats.ok}/${stats.total} URLs in ${(stats.ms / 1000).toFixed(1)} s ` +
      `(${(stats.bytes / 1024).toFixed(0)} KB fetched${stats.failed ? `, ${stats.failed} FAILED` : ''}).`
  );

  await mongoose.connection.close();
  // Fail loudly only when something could not be warmed — a cold entry would
  // just resurface as a slow first request.
  if (stats.failed > 0) process.exitCode = 1;
};

run().catch((err) => {
  console.error('warmImages failed:', err.message);
  process.exit(1);
});
