import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import Artisan from './src/models/Artisan.js';
import Product from './src/models/Product.js';
import Order from './src/models/Order.js';
import Workshop from './src/models/Workshop.js';
import Donation from './src/models/Donation.js';
import ArtisanApplication from './src/models/ArtisanApplication.js';
import GITag from './src/models/GITag.js';
import CraftStory from './src/models/CraftStory.js';
import Certificate from './src/models/Certificate.js';
import QRCode from 'qrcode';
import { isCloudinaryConfigured, uploadImageBuffer } from './src/utils/images.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/craftveda';

const shippingAddress = {
  street: '12 Craft Lane',
  city: 'Jaipur',
  state: 'Rajasthan',
  pincode: '302001',
  country: 'India'
};

const adminData = {
  name: 'Admin',
  email: 'admin@craftveda.com',
  password: 'Admin@123',
  role: 'ADMIN',
  status: 'ACTIVE'
};

const usersData = [
  { name: 'Priya Sharma', email: 'priya@craftveda.com', password: 'Admin@123', role: 'CUSTOMER', status: 'ACTIVE', phone: '9876500001' },
  { name: 'Rahul Mehta', email: 'rahul@craftveda.com', password: 'Admin@123', role: 'CUSTOMER', status: 'ACTIVE', phone: '9876500002' },
  { name: 'Anita Kumar', email: 'anita@craftveda.com', password: 'Admin@123', role: 'CUSTOMER', status: 'ACTIVE', phone: '9876500003' },
  { name: 'Vikram Singh', email: 'vikram@craftveda.com', password: 'Admin@123', role: 'CUSTOMER', status: 'BLOCKED', phone: '9876500004' },
  { name: 'Meena Devi', email: 'meena@craftveda.com', password: 'Admin@123', role: 'CUSTOMER', status: 'PENDING', phone: '9876500005' }
];

const artisansData = [
  {
    ownerEmail: 'artisan1@craftveda.com',
    name: 'Lakha Ram',
    businessName: 'Pink City Block Prints',
    description: 'Traditional hand block printing from Jaipur using natural dyes.',
    craftTypes: ['textiles', 'embroidery'],
    skills: ['Block printing', 'Natural dyeing'],
    location: { city: 'Jaipur', state: 'Rajasthan', address: 'Sanganer, Jaipur', pincode: '302029' },
    yearsOfExperience: 18
  },
  {
    ownerEmail: 'artisan2@craftveda.com',
    name: 'Sunita Bai',
    businessName: 'Blue Pottery Works',
    description: 'Authentic Jaipur blue pottery crafted by hand.',
    craftTypes: ['pottery'],
    skills: ['Blue pottery', 'Glazing'],
    location: { city: 'Jaipur', state: 'Rajasthan', address: 'Kot Jewar', pincode: '303703' },
    yearsOfExperience: 12
  },
  {
    ownerEmail: 'artisan3@craftveda.com',
    name: 'Ramesh Verma',
    businessName: 'Sandalwood Carvings',
    description: 'Heritage sandalwood and rosewood sculpture workshop.',
    craftTypes: ['woodwork', 'sculpture'],
    skills: ['Wood carving', 'Sculpture'],
    location: { city: 'Mysuru', state: 'Karnataka', address: 'Srirangapatna', pincode: '571438' },
    yearsOfExperience: 25
  }
];

const productsData = [
  { name: 'Hand Block Printed Dupatta', category: 'textiles', craftType: 'Block Printing', price: 1299, stock: 25 },
  { name: 'Blue Pottery Vase', category: 'pottery', craftType: 'Blue Pottery', price: 2499, stock: 12 },
  { name: 'Terracotta Water Jug', category: 'pottery', craftType: 'Terracotta', price: 699, stock: 40 },
  { name: 'Kundan Necklace Set', category: 'jewelry', craftType: 'Kundan', price: 4999, stock: 8 },
  { name: 'Sandalwood Elephant Carving', category: 'woodwork', craftType: 'Wood Carving', price: 3499, stock: 6 },
  { name: 'Bandhani Silk Scarf', category: 'textiles', craftType: 'Tie and Dye', price: 999, stock: 30 },
  { name: 'Meenakari Brass Plate', category: 'metalwork', craftType: 'Meenakari', price: 1899, stock: 15 },
  { name: 'Madhubani Painting', category: 'painting', craftType: 'Madhubani', price: 2799, stock: 5 },
  { name: 'Pashmina Shawl', category: 'textiles', craftType: 'Hand Weaving', price: 7999, stock: 10 },
  { name: 'Rosewood Chess Board', category: 'woodwork', craftType: 'Wood Carving', price: 2199, stock: 0, isActive: false }
];

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const workshopsData = [
  { title: 'Hand Block Printing Basics', craftType: 'textiles', price: 1500, maxParticipants: 12, duration: 4, description: 'Learn the age-old art of hand block printing with natural dyes.', level: 'beginner' },
  { title: 'Blue Pottery Wheel Class', craftType: 'pottery', price: 2000, maxParticipants: 8, duration: 6, description: 'Shape and glaze your own blue pottery pieces.', level: 'intermediate' },
  { title: 'Wood Carving Workshop', craftType: 'woodwork', price: 2500, maxParticipants: 6, duration: 8, description: 'Carve a small decorative panel under expert guidance.', level: 'advanced' }
];

const donationsData = [
  { amount: 2500, craftType: 'textiles', message: 'Keep the weavers weaving!', paymentStatus: 'completed' },
  { amount: 1000, craftType: 'pottery', message: 'For the potter community', paymentStatus: 'completed' },
  { amount: 5000, craftType: 'woodwork', message: 'Supporting heritage crafts', paymentStatus: 'completed' },
  { amount: 750, craftType: 'jewelry', message: '', paymentStatus: 'pending' }
];

// GI tags — `type` values must stay inside the public filter's allowed list.
// `artisans` are linked to the seeded profiles by index (see artisansData order).
const giTagsData = [
  {
    name: 'Sanganeri Block Printing',
    type: 'Textiles',
    description: 'Hand block printed textiles from Sanganer, Jaipur, using carved wooden blocks and natural dyes.',
    location: { state: 'Rajasthan', district: 'Jaipur', region: 'Sanganer' },
    products: ['Sarees', 'Dupattas', 'Furnishing fabric'],
    history: 'Block printing in Sanganer dates back to the 16th century, when natural dyes and hand-carved blocks became a signature of Rajasthani textile trade.',
    significance: 'Each block is carved by hand and registered by family, so a single metre of fabric can pass through a dozen pairs of hands.',
    technique: 'Carved wooden blocks are dipped in dye and stamped in repeating registration sequences on stretched cotton or silk.',
    isActive: true
  },
  {
    name: 'Chikankari of Lucknow',
    type: 'Embroidery',
    description: 'White-on-white shadow work embroidery from Lucknow, Uttar Pradesh, worked on fine cotton and muslin.',
    location: { state: 'Uttar Pradesh', district: 'Lucknow', region: 'Awadh' },
    products: ['Kurtas', 'Sarees', 'Dupattas'],
    history: 'Chikankari is believed to have been introduced in Awadh in the 16th century and remains a living craft of Lucknow’s embroidery families.',
    significance: 'More than 30 distinct stitches are used, with the shadow stitch (murri) giving the craft its characteristic soft relief.',
    technique: 'Patterns are block-printed as a guide, then hand embroidered with white thread on translucent fabric.',
    isActive: true
  },
  {
    name: 'Mysore Sandalwood Carving',
    type: 'Woodwork',
    description: 'Intricate sandalwood and rosewood carving from the Mysuru region of Karnataka.',
    location: { state: 'Karnataka', district: 'Mysuru', region: 'Srirangapatna' },
    products: ['Sculptures', 'Inlay work', 'Decorative panels'],
    history: 'Mysore has been a centre of wood carving for generations, with artisan families serving the royal court and later the export trade.',
    significance: 'Carvers work to the grain of the wood, often finishing a piece with no more than hand tools and abrasives.',
    technique: 'Seasoned wood is roughed out with chisels, refined with gouges, and polished with oils or wax.',
    isActive: true
  }
];

// Craft stories — `author` points at the seeded artisan's own user account.
const craftStoriesData = [
  {
    title: 'The Art of Sanganeri Block Printing',
    slug: 'sanganeri-block-printing',
    excerpt: 'How carved wooden blocks and natural dyes turn plain cotton into a Jaipur signature.',
    content: 'In Sanganer, on the southern edge of Jaipur, printing tables stretch the length of courtyard workshops. A design begins as a drawing, is carved into teak, and then registered by eye — each colour its own block, each impression a fraction of a millimetre from the last.\n\nThe craft survives because the knowledge is held in families: which block pairs with which dye, how a fabric is washed and sunned between colours, and how a repeat is kept true across six metres of cloth. Natural dyes and hand-block registration give every length small variations that machines cannot reproduce.\n\nOn CraftVeda, Sanganeri pieces are listed with their artisan and craft type so buyers can see who printed them and where the work was done.',
    category: 'technique',
    craftType: 'Block Printing',
    region: 'Rajasthan',
    featured: true,
    readTime: 5,
    tags: ['block-printing', 'textiles', 'rajasthan']
  },
  {
    title: 'Blue Pottery of Jaipur: A Living Tradition',
    slug: 'blue-pottery-of-jaipur',
    excerpt: 'Clay-free pottery, cobalt patterns, and the kiln discipline behind every blue vase.',
    content: 'Jaipur blue pottery is unusual in that it contains no clay at all. The body is made from a dough of quartz stone powder, fuller\'s earth and gum, pressed into moulds and fired at temperatures that leave little margin for error.\n\nThe decoration is where the blue comes from: cobalt and copper oxides painted onto the white body, then glazed and fired again. A single hairline crack in the kiln can destroy a week of work, which is why potters speak as much about firing schedules as about design.\n\nThe craft was revived in the 20th century and now supports workshop families across Jaipur, who sell both traditional motifs and contemporary forms.',
    category: 'heritage',
    craftType: 'Blue Pottery',
    region: 'Rajasthan',
    featured: true,
    readTime: 6,
    tags: ['pottery', 'jaipur', 'heritage']
  },
  {
    title: 'Mysore Sandalwood Carving Through Generations',
    slug: 'mysore-sandalwood-carving',
    excerpt: 'A carver in Srirangapatna on grain, tools, and passing the workshop to the next generation.',
    content: 'Sandalwood carving in the Mysuru region is learned by standing at the bench. An apprentice starts by sharpening tools and watching how a carver reads the grain before the chisel ever touches the wood.\n\nSeasoned sandalwood and rosewood are roughed out, refined and polished largely by hand. The scent of the wood is part of the workshop, and the value of a finished piece depends as much on the direction of the grain as on the design.\n\nAs machine carving becomes cheaper, the carvers who remain are those who can explain the provenance of a piece — which tree, which village, which hands.',
    category: 'artisan-story',
    craftType: 'Wood Carving',
    region: 'Karnataka',
    featured: false,
    readTime: 7,
    tags: ['woodwork', 'karnataka', 'artisan-story']
  }
];

// --- placeholder artwork for Cloudinary (SVG — no image dependencies) -------
// Fixed public_ids under craftveda/seed mean a re-seed overwrites the same
// assets instead of creating duplicates. Everything is skipped without
// credentials, so `npm run seed` still works offline / unconfigured.
const SEED_FOLDER = 'craftveda/seed';

const SEED_PALETTES = [
  { bg1: '#B4553C', bg2: '#E0A526', ink: '#FAF6EF', accent: '#2E3A6E' },
  { bg1: '#2E3A6E', bg2: '#4A5AA0', ink: '#FAF6EF', accent: '#E0A526' },
  { bg1: '#FAF6EF', bg2: '#EFE3D0', ink: '#2B1A12', accent: '#B4553C' }
];

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const productArtwork = (title, variant) => {
  const p = SEED_PALETTES[variant % SEED_PALETTES.length];
  const label = escapeXml(title.length > 30 ? `${title.slice(0, 29)}…` : title);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/>
</linearGradient>
<pattern id="d" width="44" height="44" patternUnits="userSpaceOnUse">
<circle cx="8" cy="8" r="3" fill="${p.ink}" opacity="0.16"/>
</pattern>
</defs>
<rect width="800" height="1000" fill="url(#g)"/>
<rect width="800" height="1000" fill="url(#d)"/>
<path d="M150 780 V430 a250 250 0 0 1 500 0 V780 Z" fill="${p.ink}" opacity="0.14"/>
<path d="M150 780 V430 a250 250 0 0 1 500 0 V780 Z" fill="none" stroke="${p.ink}" stroke-width="9" opacity="0.9"/>
<path d="M235 780 V455 a165 165 0 0 1 330 0 V780 Z" fill="none" stroke="${p.ink}" stroke-width="4" opacity="0.6"/>
<circle cx="400" cy="355" r="74" fill="${p.accent}" opacity="0.92"/>
<circle cx="400" cy="355" r="74" fill="none" stroke="${p.ink}" stroke-width="6"/>
<circle cx="400" cy="355" r="44" fill="none" stroke="${p.ink}" stroke-width="4" opacity="0.8"/>
<rect x="150" y="780" width="500" height="6" fill="${p.ink}" opacity="0.85"/>
<text x="400" y="866" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="${p.ink}">${label}</text>
<text x="400" y="924" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="8" fill="${p.ink}" opacity="0.75">CRAFTVEDA</text>
</svg>`;
};

const profileArtwork = (initials, variant) => {
  const p = SEED_PALETTES[variant % SEED_PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/>
</linearGradient></defs>
<rect width="600" height="600" fill="url(#g)"/>
<circle cx="300" cy="300" r="210" fill="${p.ink}" opacity="0.14"/>
<circle cx="300" cy="300" r="210" fill="none" stroke="${p.ink}" stroke-width="8" opacity="0.9"/>
<text x="300" y="345" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="150" fill="${p.ink}">${escapeXml(initials)}</text>
</svg>`;
};

const coverArtwork = (label, variant) => {
  const p = SEED_PALETTES[variant % SEED_PALETTES.length];
  const text = escapeXml(label.length > 34 ? `${label.slice(0, 33)}…` : label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/>
</linearGradient>
<pattern id="d" width="50" height="50" patternUnits="userSpaceOnUse">
<circle cx="10" cy="10" r="3.5" fill="${p.ink}" opacity="0.18"/>
</pattern>
</defs>
<rect width="1200" height="500" fill="url(#g)"/>
<rect width="1200" height="500" fill="url(#d)"/>
<path d="M860 500 V250 a140 140 0 0 1 280 0 V500 Z" fill="${p.ink}" opacity="0.16"/>
<path d="M860 500 V250 a140 140 0 0 1 280 0 V500 Z" fill="none" stroke="${p.ink}" stroke-width="7" opacity="0.85"/>
<circle cx="180" cy="140" r="70" fill="none" stroke="${p.ink}" stroke-width="6" opacity="0.8"/>
<text x="80" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="${p.ink}">${text}</text>
<text x="84" y="360" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="9" fill="${p.ink}" opacity="0.75">HERITAGE CRAFT STUDIO</text>
</svg>`;
};

const seedImages = async (products, artisanProfiles) => {
  if (!isCloudinaryConfigured()) {
    console.log('  Cloudinary not configured — seed images skipped');
    return;
  }

  console.log('  uploading seed images to Cloudinary (folder craftveda/seed)');

  // 3 images per product, fixed ids so re-seeding never duplicates assets.
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    if ((product.images || []).length >= 3) continue;
    const urls = [];
    for (let n = 1; n <= 3; n++) {
      const { secure_url } = await uploadImageBuffer(
        Buffer.from(productArtwork(product.name, i + n), 'utf8'),
        { folder: SEED_FOLDER, publicId: `product-${i}-${n}` }
      );
      urls.push(secure_url);
    }
    product.images = urls;
    await product.save();
    console.log(`  seeded 3 images for ${product.name}`);
  }

  // Optional profile + cover per artisan (also fixed ids).
  for (let i = 0; i < artisanProfiles.length; i++) {
    const profile = artisanProfiles[i];
    if (profile.profileImage && profile.coverImage) continue;

    if (!profile.profileImage) {
      const initials = profile.businessName
        .split(/\s+/)
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      const { secure_url } = await uploadImageBuffer(
        Buffer.from(profileArtwork(initials, i), 'utf8'),
        { folder: SEED_FOLDER, publicId: `artisan-${i}-profile` }
      );
      profile.profileImage = secure_url;
    }

    if (!profile.coverImage) {
      const { secure_url } = await uploadImageBuffer(
        Buffer.from(coverArtwork(profile.businessName, i + 1), 'utf8'),
        { folder: SEED_FOLDER, publicId: `artisan-${i}-cover` }
      );
      profile.coverImage = secure_url;
    }

    await profile.save();
    console.log(`  seeded profile images for ${profile.businessName}`);
  }
};

const ensureUser = async (data) => {
  let user = await User.findOne({ email: data.email });
  if (!user) {
    user = await User.create(data);
    console.log(`  created user ${data.email}`);
  } else {
    user.name = data.name;
    user.role = data.role;
    user.status = data.status;
    if (data.phone) user.phone = data.phone;
    if (data.password) user.password = data.password;
    await user.save();
  }
  return user;
};

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const admin = await ensureUser(adminData);
  const customers = [];
  for (const userData of usersData) customers.push(await ensureUser(userData));

  const artisanProfiles = [];
  for (const artisan of artisansData) {
    const owner = await ensureUser({
      name: artisan.name,
      email: artisan.ownerEmail,
      password: 'Admin@123',
      role: 'ARTISAN',
      status: 'ACTIVE'
    });

    let profile = await Artisan.findOne({ user: owner._id });
    if (!profile) {
      profile = await Artisan.create({
        user: owner._id,
        businessName: artisan.businessName,
        description: artisan.description,
        craftTypes: artisan.craftTypes,
        skills: artisan.skills,
        location: artisan.location,
        yearsOfExperience: artisan.yearsOfExperience,
        isVerified: true,
        rating: 4.5
      });
      console.log(`  created artisan ${artisan.businessName}`);
    }
    artisanProfiles.push(profile);
  }

  const products = [];
  for (let i = 0; i < productsData.length; i++) {
    const data = productsData[i];
    let product = await Product.findOne({ name: data.name });
    if (!product) {
      product = await Product.create({
        ...data,
        isActive: data.isActive !== false,
        description: `${data.name} — authentic ${data.craftType} piece made by hand.`,
        artisan: artisanProfiles[i % artisanProfiles.length]._id
      });
      console.log(`  created product ${data.name}`);
    }
    products.push(product);
  }

  // Images come after the product documents exist (create first, upload after).
  await seedImages(products, artisanProfiles);

  if ((await Order.countDocuments()) === 0) {
    for (let i = 0; i < 10; i++) {
      const product = products[i % products.length];
      const quantity = (i % 3) + 1;
      const subtotal = product.price * quantity;
      const shippingCost = subtotal > 500 ? 0 : 50;
      const tax = Math.round(subtotal * 0.18);
      const orderStatus = ORDER_STATUSES[i % ORDER_STATUSES.length];

      await Order.create({
        user: customers[i % customers.length]._id,
        items: [{ product: product._id, quantity, price: product.price }],
        shippingAddress,
        subtotal,
        shippingCost,
        tax,
        total: subtotal + shippingCost + tax,
        paymentMethod: ['cod', 'upi', 'card'][i % 3],
        paymentStatus: ['delivered', 'shipped'].includes(orderStatus) ? 'paid' : ['cancelled'].includes(orderStatus) ? 'refunded' : 'pending',
        orderStatus
      });
    }
    console.log('  created 10 orders');
  }

  // --- Admin dashboard charts: orders spread across the recent months ---
  // Find-or-created by their `notes` marker (never deleteMany), so re-running
  // the seed does not duplicate them and the charts are not empty in the demo.
  // createdAt is stamped with the native driver because mongoose timestamps
  // would otherwise write "now" and collapse every order into the current month.
  const chartOrderSeeds = [
    { marker: 'seed:chart:1', monthsAgo: 5, day: 9, product: 'Hand Block Printed Dupatta', quantity: 2, buyer: 'priya@craftveda.com', orderStatus: 'delivered' },
    { marker: 'seed:chart:2', monthsAgo: 5, day: 21, product: 'Kundan Necklace Set', quantity: 1, buyer: 'rahul@craftveda.com', orderStatus: 'cancelled' },
    { marker: 'seed:chart:3', monthsAgo: 4, day: 6, product: 'Blue Pottery Vase', quantity: 1, buyer: 'anita@craftveda.com', orderStatus: 'shipped' },
    { marker: 'seed:chart:4', monthsAgo: 3, day: 14, product: 'Madhubani Painting', quantity: 1, buyer: 'priya@craftveda.com', orderStatus: 'delivered' },
    { marker: 'seed:chart:5', monthsAgo: 3, day: 25, product: 'Terracotta Water Jug', quantity: 3, buyer: 'meena@craftveda.com', orderStatus: 'processing' },
    { marker: 'seed:chart:6', monthsAgo: 2, day: 8, product: 'Bandhani Silk Scarf', quantity: 2, buyer: 'rahul@craftveda.com', orderStatus: 'confirmed' },
    { marker: 'seed:chart:7', monthsAgo: 2, day: 19, product: 'Meenakari Brass Plate', quantity: 1, buyer: 'anita@craftveda.com', orderStatus: 'pending' },
    { marker: 'seed:chart:8', monthsAgo: 1, day: 11, product: 'Pashmina Shawl', quantity: 1, buyer: 'priya@craftveda.com', orderStatus: 'delivered' },
    { marker: 'seed:chart:9', monthsAgo: 1, day: 24, product: 'Sandalwood Elephant Carving', quantity: 1, buyer: 'rahul@craftveda.com', orderStatus: 'cancelled' },
    { marker: 'seed:chart:10', monthsAgo: 0, day: 4, product: 'Hand Block Printed Dupatta', quantity: 1, buyer: 'anita@craftveda.com', orderStatus: 'shipped' },
    { marker: 'seed:chart:11', monthsAgo: 0, day: 12, product: 'Blue Pottery Vase', quantity: 2, buyer: 'priya@craftveda.com', orderStatus: 'confirmed' }
  ];

  const backdated = (monthsAgo, day) => {
    const now = new Date();
    const safeDay = monthsAgo === 0 ? Math.min(day, now.getUTCDate()) : Math.min(day, 28);
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, safeDay, 12, 0, 0));
  };

  for (const seedOrder of chartOrderSeeds) {
    const exists = await Order.findOne({ notes: seedOrder.marker });
    if (exists) continue;

    const product = products.find((p) => p.name === seedOrder.product);
    const buyer = await User.findOne({ email: seedOrder.buyer });
    if (!product || !buyer) continue;

    const subtotal = product.price * seedOrder.quantity;
    const order = await Order.create({
      user: buyer._id,
      items: [{ product: product._id, quantity: seedOrder.quantity, price: product.price }],
      shippingAddress,
      subtotal,
      shippingCost: 0,
      tax: 0,
      total: subtotal,
      paymentMethod: 'upi',
      paymentStatus: seedOrder.orderStatus === 'cancelled' ? 'refunded' : ['delivered', 'shipped'].includes(seedOrder.orderStatus) ? 'paid' : 'pending',
      orderStatus: seedOrder.orderStatus,
      notes: seedOrder.marker
    });
    await Order.collection.updateOne(
      { _id: order._id },
      { $set: { createdAt: backdated(seedOrder.monthsAgo, seedOrder.day) } }
    );
    console.log(`  created chart order ${seedOrder.marker} (${seedOrder.orderStatus}, ${seedOrder.monthsAgo} months back)`);
  }

  for (let i = 0; i < workshopsData.length; i++) {
    const data = workshopsData[i];
    const exists = await Workshop.findOne({ title: data.title });
    if (!exists) {
      await Workshop.create({
        ...data,
        artisan: artisanProfiles[i % artisanProfiles.length]._id,
        language: 'Hindi',
        location: { type: 'offline', city: artisanProfiles[i % artisanProfiles.length].location?.city, state: artisanProfiles[i % artisanProfiles.length].location?.state }
      });
      console.log(`  created workshop ${data.title}`);
    }
  }

  if ((await Donation.countDocuments()) === 0) {
    for (let i = 0; i < donationsData.length; i++) {
      await Donation.create({
        ...donationsData[i],
        donor: customers[i % customers.length]._id,
        isAnonymous: i % 2 === 1
      });
    }
    console.log('  created donations');
  }

  // --- GI tags (public GI search page) ---
  for (const data of giTagsData) {
    const exists = await GITag.findOne({ name: data.name });
    if (exists) continue;
    const artisans = [];
    if (data.name.startsWith('Sanganeri')) artisans.push(artisanProfiles[0]._id);
    if (data.name.startsWith('Mysore')) artisans.push(artisanProfiles[2]._id);
    await GITag.create({ ...data, artisans });
    console.log(`  created GI tag ${data.name}`);
  }

  // --- Craft stories (stories list + detail pages) ---
  for (const data of craftStoriesData) {
    const exists = await CraftStory.findOne({ slug: data.slug });
    if (exists) continue;
    const authorIndex = data.region === 'Karnataka' ? 2 : data.craftType === 'Blue Pottery' ? 1 : 0;
    await CraftStory.create({
      ...data,
      author: artisanProfiles[authorIndex].user,
      publishedAt: new Date()
    });
    console.log(`  created craft story ${data.title}`);
  }

  // --- Certificates (public /verify page) ---
  // Certificates can only be issued for delivered orders, so make sure two exist.
  let deliveredOrders = await Order.find({ orderStatus: 'delivered' }).sort('createdAt');
  if (deliveredOrders.length < 2) {
    const product = await Product.findOne({ name: 'Blue Pottery Vase' });
    const buyer = await User.findOne({ email: 'priya@craftveda.com' });
    if (product && buyer) {
      const tax = Math.round(product.price * 0.18);
      await Order.create({
        user: buyer._id,
        items: [{ product: product._id, quantity: 1, price: product.price }],
        shippingAddress,
        subtotal: product.price,
        shippingCost: 0,
        tax,
        total: product.price + tax,
        paymentMethod: 'upi',
        paymentStatus: 'paid',
        orderStatus: 'delivered'
      });
      console.log('  created a delivered order for certificate seeding');
      deliveredOrders = await Order.find({ orderStatus: 'delivered' }).sort('createdAt');
    }
  }

  const seedCertificateNumbers = ['CV-SEED-0001', 'CV-SEED-0002'];
  // Numbers a previous run already handed out must never be reused: backdated
  // chart orders change which delivered order the loop sees first.
  const usedCertNumbers = new Set(
    (await Certificate.find({ certificateNumber: { $in: seedCertificateNumbers } })
      .select('certificateNumber').lean()).map((cert) => cert.certificateNumber)
  );
  let seedCertIndex = 0;
  for (const order of deliveredOrders) {
    if (seedCertIndex >= seedCertificateNumbers.length) break;
    const product = await Product.findById(order.items[0]?.product).select('artisan name');
    if (!product) continue;
    const alreadyIssued = await Certificate.findOne({ order: order._id, product: product._id });
    if (alreadyIssued) continue;

    while (seedCertIndex < seedCertificateNumbers.length && usedCertNumbers.has(seedCertificateNumbers[seedCertIndex])) {
      seedCertIndex += 1;
    }
    if (seedCertIndex >= seedCertificateNumbers.length) break;

    const certificateNumber = seedCertificateNumbers[seedCertIndex++];
    usedCertNumbers.add(certificateNumber);
    const qrCode = await QRCode.toDataURL(JSON.stringify({
      cert: certificateNumber,
      product: product._id.toString(),
      artisan: product.artisan.toString(),
      timestamp: Date.now()
    }));

    await Certificate.create({
      order: order._id,
      product: product._id,
      artisan: product.artisan,
      buyer: order.user,
      certificateNumber,
      qrCode
    });
    console.log(`  created certificate ${certificateNumber}`);
  }

  for (let i = 0; i < 3; i++) {
    const applicant = customers[i];
    const exists = await ArtisanApplication.findOne({ user: applicant._id });
    if (!exists) {
      await ArtisanApplication.create({
        user: applicant._id,
        businessName: `Heritage Crafts by ${applicant.name}`,
        description: `Traditional craft studio of ${applicant.name} specialising in handmade goods.`,
        craftTypes: ['textiles', 'pottery', 'woodwork'][i] ? [['textiles'], ['pottery'], ['woodwork']][i] : ['textiles'],
        skills: ['Handicraft', 'Design'],
        yearsOfExperience: 5 + i,
        location: shippingAddress,
        status: 'PENDING'
      });
      console.log(`  created pending application for ${applicant.email}`);
    }
  }

  console.log(`Seed complete. Admin login: ${admin.email} / Admin@123`);
  await mongoose.connection.close();
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
