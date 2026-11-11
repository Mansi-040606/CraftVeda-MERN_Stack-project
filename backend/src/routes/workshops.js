import express from 'express';
import { body } from 'express-validator';
import { protect, adminOnly, artisanOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  listWorkshopsValidators,
  createWorkshopValidators,
  updateWorkshopValidators,
  bookWorkshopValidators,
  idParamValidators
} from '../validators/workshopValidators.js';
import {
  listWorkshops,
  adminListWorkshops,
  adminToggleActive,
  listMine,
  createWorkshop,
  listMineWorkshopBookings,
  updateWorkshop,
  deleteWorkshop,
  listMyBookings,
  cancelBooking,
  getWorkshop,
  bookWorkshop
} from '../controllers/workshopController.js';

const router = express.Router();

// Public catalogue.
router.get('/', listWorkshopsValidators, validate, listWorkshops);

// Admin management (never reachable via /:id below).
router.get('/admin', protect, adminOnly, adminListWorkshops);

// Artisan management of own workshops (declared before /:id).
router.get('/mine', protect, artisanOnly, listMine);
router.post('/mine', protect, artisanOnly, createWorkshopValidators, validate, createWorkshop);
router.get('/mine/:id/bookings', protect, artisanOnly, idParamValidators, validate, listMineWorkshopBookings);
router.put('/mine/:id', protect, artisanOnly, updateWorkshopValidators, validate, updateWorkshop);
router.delete('/mine/:id', protect, artisanOnly, idParamValidators, validate, deleteWorkshop);

// The logged-in user's own bookings.
router.get('/my-bookings', protect, listMyBookings);
router.delete('/bookings/:id', protect, idParamValidators, validate, cancelBooking);

// Admin active-toggle (kept from the original API).
router.patch('/:id', protect, adminOnly, [
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], validate, adminToggleActive);

// Public detail + booking.
router.get('/:id', idParamValidators, validate, getWorkshop);
router.post('/:id/book', protect, bookWorkshopValidators, validate, bookWorkshop);

export default router;
