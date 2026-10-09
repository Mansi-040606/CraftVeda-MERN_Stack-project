import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@craftveda.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminName = process.env.ADMIN_NAME || 'Admin';

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log('Admin user already exists');
    process.exit(0);
  }

  const admin = await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'ADMIN',
    status: 'ACTIVE'
  });

  console.log(`Admin created successfully:`);
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Role: ${admin.role}`);
  
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
};

seedAdmin();