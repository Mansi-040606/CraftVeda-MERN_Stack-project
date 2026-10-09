import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import artisanRoutes from './routes/artisans.js';
import artisanApplicationRoutes from './routes/artisanApplications.js';
import workshopRoutes from './routes/workshops.js';
import orderRoutes from './routes/orders.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import paymentRoutes from './routes/payments.js';
import reviewRoutes from './routes/reviews.js';
import donationRoutes from './routes/donations.js';
import certificateRoutes from './routes/certificates.js';
import giTagRoutes from './routes/giTags.js';
import craftStoryRoutes from './routes/craftStories.js';
import adminRoutes from './routes/admin.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CLIENT_URL || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    if (!origin || allowed.includes(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/artisan-applications', artisanApplicationRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/gi-tags', giTagRoutes);
app.use('/api/craft-stories', craftStoryRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;
