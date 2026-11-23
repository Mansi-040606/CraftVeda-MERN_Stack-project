import dotenv from 'dotenv';
dotenv.config();
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { verifyMailer } from './src/utils/mailer.js';

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // One-shot SMTP health check (never throws, never blocks for long — the
  // transporter has bounded timeouts). On failure it logs one clear warning
  // and flags the mailer unhealthy; the server keeps running.
  await verifyMailer();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
