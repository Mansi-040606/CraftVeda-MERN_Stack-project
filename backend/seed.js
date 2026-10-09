import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import Artisan from './src/models/Artisan.js';
import Product from './src/models/Product.js';
import Order from './src/models/Order.js';
import Workshop from './src/models/Workshop.js';
import Donation from './src/models/Donation.js';
import ArtisanApplication from './src/models/ArtisanApplication.js';

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
