import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import ApiError from './ApiError.js';

// --- rules shared by every image endpoint ---------------------------------
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB per file
export const MAX_IMAGES_PER_PRODUCT = 6;
export const MAX_PROFILE_IMAGES = 1;

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;
// Any extension Cloudinary may put on a delivered asset — used only to derive
// the public_id back from a stored URL (upload rules stay at ALLOWED_EXT).
const DELIVERED_EXT = /\.(jpe?g|png|webp|gif|svg|avif|bmp|ico|tiff?)$/i;

export const PRODUCT_FOLDER = 'craftveda/products';
export const PROFILE_FOLDER = 'craftveda/profiles';

const credentials = () => ({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Read from process.env only, and never log the values.
export const isCloudinaryConfigured = () => {
  const creds = credentials();
  return Boolean(creds.cloud_name && creds.api_key && creds.api_secret);
};

// Test-only hook: the E2E suite runs with fake credentials and CLOUDINARY_MOCK=1
// so no real upload ever happens. Never set it outside tests.
const isMock = () => process.env.CLOUDINARY_MOCK === '1';

const configureCloudinary = () => {
  const creds = credentials();
  cloudinary.config({
    cloud_name: creds.cloud_name,
    api_key: creds.api_key,
    api_secret: creds.api_secret,
    secure: true
  });
};

// 503 before anything is buffered or uploaded when the keys are absent.
export const requireCloudinary = (req, res, next) => {
  if (!isCloudinaryConfigured()) {
    return next(new ApiError(503, 'Image upload is not configured'));
  }
  next();
};

// --- real file type sniffing (the browser-declared mimetype is not trusted) ---
export const sniffImageMime = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  // RIFF....WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
};

// Friendly 400s for every rejected file. Runs before any Cloudinary call.
export const validateImageFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new ApiError(400, 'Choose at least one image to upload');
  }
  for (const file of files) {
    const real = sniffImageMime(file.buffer);
    if (!real) {
      throw new ApiError(400, 'Only JPG, PNG and WEBP image files are allowed');
    }
    if (!ALLOWED_MIME.includes(real)) {
      throw new ApiError(400, 'Only JPG, PNG and WEBP image files are allowed');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ApiError(400, 'Each image must be 2 MB or smaller');
    }
  }
  return files;
};

// --- multer: memory storage, buffers are streamed to Cloudinary --------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_PRODUCT },
  fileFilter: (req, file, cb) => {
    const declared = (file.mimetype || '').toLowerCase();
    const okMime = ALLOWED_MIME.includes(declared) || declared === 'image/jpg';
    const okExt = ALLOWED_EXT.test(file.originalname || '');
    if (!okMime || !okExt) {
      return cb(new ApiError(400, 'Only JPG, PNG and WEBP image files are allowed'));
    }
    cb(null, true);
  }
});

// Wraps multer and turns its limit codes into friendly 400 responses.
export const handleUpload = (field, maxFiles = 1) => (req, res, next) => {
  upload.array(field, maxFiles)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, 'Each image must be 2 MB or smaller'));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ApiError(400, `You can upload at most ${maxFiles} image(s) at a time`));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(400, `Unexpected upload field "${err.field}"`));
    }
    next(err);
  });
};

// --- Cloudinary transport ----------------------------------------------------
const randomId = () => `img_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const mockUrl = (publicId) =>
  `https://res.cloudinary.com/mockcloud/image/upload/v1700000000/${publicId}.jpg`;

// Uploads one buffer. Returns { secure_url, public_id }.
// Delivery uses f_auto/q_auto + size variants built from this one URL on the
// client (see frontend/src/utils/imageUrl.js) — never a second upload.
export const uploadImageBuffer = async (buffer, { folder, publicId } = {}) => {
  const targetFolder = folder || PRODUCT_FOLDER;
  const id = publicId || randomId();
  const fullPublicId = publicId ? `${targetFolder}/${publicId}` : `${targetFolder}/${id}`;

  if (isMock()) {
    return { secure_url: mockUrl(fullPublicId), public_id: fullPublicId };
  }

  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: targetFolder,
        public_id: publicId,
        overwrite: Boolean(publicId),
        unique_filename: !publicId,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          return reject(new ApiError(502, 'Image upload failed — please try again'));
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

// Derives the Cloudinary public_id from a stored secure_url.
// Chosen over a parallel DB field because Product.images stays a plain string
// array (nothing to migrate, order/delete/reorder can never drift out of sync).
export const publicIdFromUrl = (url) => {
  if (typeof url !== 'string') return null;
  const marker = '/image/upload/';
  const at = url.indexOf(marker);
  if (at === -1) return null;

  let tail = url.slice(at + marker.length);
  const query = tail.indexOf('?');
  if (query !== -1) tail = tail.slice(0, query);

  const segments = tail.split('/').filter(Boolean);
  while (
    segments.length > 1 &&
    (segments[0].includes(',') || /^v\d+$/.test(segments[0]))
  ) {
    segments.shift(); // transformation + version segments
  }
  if (segments.length === 0) return null;

  const last = segments[segments.length - 1];
  if (DELIVERED_EXT.test(last)) {
    segments[segments.length - 1] = last.replace(DELIVERED_EXT, '');
  }
  const publicId = segments.join('/');
  return publicId || null;
};

// Best-effort remote delete: never throws, never blocks a local delete.
export const destroyImageByUrl = async (url) => {
  const publicId = publicIdFromUrl(url);
  if (!publicId || !isCloudinaryConfigured() || isMock()) return false;
  try {
    configureCloudinary();
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return res?.result === 'ok';
  } catch {
    return false;
  }
};

// Deletes many images without ever failing the caller.
export const destroyImageUrls = async (urls = []) => {
  await Promise.allSettled(urls.filter(Boolean).map((url) => destroyImageByUrl(url)));
};

// Uploads several buffers in order; rolls back anything already uploaded if one fails.
export const uploadImageBuffers = async (files, { folder } = {}) => {
  const uploaded = [];
  try {
    for (const file of files) {
      uploaded.push(await uploadImageBuffer(file.buffer, { folder }));
    }
    return uploaded;
  } catch (err) {
    await destroyImageUrls(uploaded.map((item) => item.secure_url));
    throw err;
  }
};
