import express from 'express';
import userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, preventSelfModification, requireSuperAdmin } from '../middleware/rbac.js';
import { validatePagination, validateSort, isValidObjectId } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

// Super Admin Only
router.get('/pending-admins', requireSuperAdmin, userController.getPendingAdmins);
router.post('/:id/approve', requireSuperAdmin, isValidObjectId('id'), userController.approveAdmin);

// Admin Only
router.get('/pending-members', requireAdmin, userController.getPendingMembers);

router.post('/', requireAdmin, userController.createUser);
router.get('/', authenticate, validatePagination, validateSort(['name', 'email', 'createdAt', 'role']), userController.getAllUsers);
router.get('/search', validatePagination, userController.searchUsers);
router.patch('/profile', authenticate, userController.updateUserProfile);
router.get('/stats', requireAdmin, userController.getUserStats);
router.get('/:id', isValidObjectId('id'), userController.getUserById);
router.put('/:id', isValidObjectId('id'), userController.updateUser);
router.delete('/:id', requireAdmin, isValidObjectId('id'), preventSelfModification, userController.deleteUser);
router.patch('/:id/deactivate', requireAdmin, isValidObjectId('id'), preventSelfModification, userController.deactivateUser);
router.patch('/:id/activate', requireAdmin, isValidObjectId('id'), userController.activateUser);

export default router;
