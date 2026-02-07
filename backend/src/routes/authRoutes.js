import express from 'express';
import passport from 'passport';
import authController from '../controllers/authController.js';
import { authenticate, verifyRefreshToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import { body } from 'express-validator';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Validation schemas
const registerValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['Admin', 'Manager', 'Member']).withMessage('Invalid role'),
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

// Routes
// Public registration (no auth required)
router.post('/register', registerValidation, validate, authController.register);

router.post('/login', authLimiter, loginValidation, validate, authController.login);
router.post('/refresh', verifyRefreshToken, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getCurrentUser);

// Google OAuth routes
router.get('/google', (req, res, next) => {
    // Pass admin intent through OAuth state parameter
    const adminIntent = req.query.adminIntent === 'true';
    const state = adminIntent ? 'admin' : 'user';

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: state
    })(req, res, next);
});
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), authController.googleAuth);

router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

export default router;
