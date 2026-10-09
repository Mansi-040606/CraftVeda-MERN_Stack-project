import express from 'express';
import { body } from 'express-validator';
import ArtisanApplication from '../models/ArtisanApplication.js';
import User from '../models/User.js';
import Artisan from '../models/Artisan.js';
import { protect, adminOnly, allowRoles } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

const applicationValidators = [
  body('businessName')
    .notEmpty().withMessage('Business name is required').bail()
    .isString().withMessage('Business name must be a string').bail()
    .trim()
    .isLength({ min: 2 }).withMessage('Business name must be at least 2 characters'),
  body('craftTypes')
    .notEmpty().withMessage('Craft types are required').bail()
    .isArray({ min: 1 }).withMessage('Craft types must be a non-empty array'),
  body('craftTypes.*')
    .isString().withMessage('Craft types must contain only strings').bail()
    .trim()
    .notEmpty().withMessage('Craft types cannot contain empty values'),
  body('skills')
    .notEmpty().withMessage('Skills are required').bail()
    .isArray({ min: 1 }).withMessage('Skills must be a non-empty array'),
  body('skills.*')
    .isString().withMessage('Skills must contain only strings').bail()
    .trim()
    .notEmpty().withMessage('Skills cannot contain empty values')
];

router.post('/', protect, allowRoles('CUSTOMER'), applicationValidators, validate, catchAsync(async (req, res) => {
  const existingApplication = await ArtisanApplication.findOne({ user: req.user._id });
  if (existingApplication) {
    throw new ApiError(400, 'You already have a pending application');
  }

  const application = await ArtisanApplication.create({
    ...req.body,
    user: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    application
  });
}));

router.get('/', protect, adminOnly, catchAsync(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  
  const applications = await ArtisanApplication.find(query)
    .populate('user', 'name email phone avatar')
    .populate('reviewedBy', 'name')
    .sort('-createdAt');

  res.json({
    success: true,
    count: applications.length,
    applications
  });
}));

router.get('/my-application', protect, allowRoles('CUSTOMER'), catchAsync(async (req, res) => {
  const application = await ArtisanApplication.findOne({ user: req.user._id })
    .populate('reviewedBy', 'name');

  if (!application) {
    throw new ApiError(404, 'No application found');
  }

  res.json({
    success: true,
    application
  });
}));

router.get('/:id', protect, catchAsync(async (req, res) => {
  const application = await ArtisanApplication.findById(req.params.id)
    .populate('user', 'name email phone avatar')
    .populate('reviewedBy', 'name');

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  res.json({
    success: true,
    application
  });
}));

router.put('/:id/approve', protect, adminOnly, catchAsync(async (req, res) => {
  const application = await ArtisanApplication.findById(req.params.id);
  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  if (application.status !== 'PENDING') {
    throw new ApiError(400, 'Application is not pending');
  }

  application.status = 'APPROVED';
  application.adminNotes = req.body.adminNotes || 'Approved';
  application.reviewedAt = new Date();
  application.reviewedBy = req.user._id;
  await application.save();

  await User.findByIdAndUpdate(application.user, { role: 'ARTISAN' });

  const existingArtisan = await Artisan.findOne({ user: application.user });
  if (!existingArtisan) {
    await Artisan.create({
      user: application.user,
      businessName: application.businessName,
      description: application.description,
      craftTypes: application.craftTypes,
      skills: application.skills,
      yearsOfExperience: application.yearsOfExperience,
      location: application.location,
      isVerified: false
    });
  }

  res.json({
    success: true,
    message: 'Application approved. User is now an artisan.',
    application
  });
}));

router.put('/:id/reject', protect, adminOnly, catchAsync(async (req, res) => {
  const application = await ArtisanApplication.findById(req.params.id);
  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  if (application.status !== 'PENDING') {
    throw new ApiError(400, 'Application is not pending');
  }

  application.status = 'REJECTED';
  application.adminNotes = req.body.adminNotes || 'Rejected';
  application.reviewedAt = new Date();
  application.reviewedBy = req.user._id;
  await application.save();

  res.json({
    success: true,
    message: 'Application rejected.',
    application
  });
}));

export default router;