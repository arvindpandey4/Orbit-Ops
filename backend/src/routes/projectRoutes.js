import express from 'express';
import projectController from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdminOrManager, requireProjectMember, requireProjectPermission, requireActiveProject } from '../middleware/rbac.js';
import { validatePagination, validateSort, isValidObjectId } from '../middleware/validation.js';
import { projectCreationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requireAdminOrManager, projectCreationLimiter, projectController.createProject);
router.get('/', validatePagination, validateSort(['name', 'createdAt', 'status']), projectController.getProjects);
router.get('/:id', isValidObjectId('id'), requireProjectMember, projectController.getProjectById);
router.put('/:id', isValidObjectId('id'), requireProjectPermission('Manager'), requireActiveProject, projectController.updateProject);
router.delete('/:id', isValidObjectId('id'), requireProjectPermission('Admin'), projectController.deleteProject);
router.patch('/:id/archive', isValidObjectId('id'), requireProjectPermission('Manager'), projectController.archiveProject);
router.patch('/:id/unarchive', isValidObjectId('id'), requireProjectPermission('Manager'), projectController.unarchiveProject);
router.post('/:id/members', isValidObjectId('id'), requireProjectPermission('Manager'), requireActiveProject, projectController.addMember);
router.delete('/:id/members/:userId', isValidObjectId('id'), requireProjectPermission('Manager'), requireActiveProject, projectController.removeMember);
router.put('/:id/members/:userId', isValidObjectId('id'), requireProjectPermission('Admin'), requireActiveProject, projectController.updateMemberRole);
router.get('/:id/stats', isValidObjectId('id'), requireProjectMember, projectController.getProjectStats);

export default router;
