import express from 'express';
import taskController from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';
import { requireProjectMember, requireProjectPermission, requireActiveProject } from '../middleware/rbac.js';
import { validatePagination, validateSort, isValidObjectId } from '../middleware/validation.js';
import { taskCreationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

// Task creation service handles project checks
router.post('/', taskCreationLimiter, taskController.createTask);
router.get('/', validatePagination, validateSort(['title', 'status', 'priority', 'dueDate', 'createdAt']), taskController.getTasks);
router.get('/my-tasks', validatePagination, validateSort(['createdAt', 'dueDate', 'status']), taskController.getMyTasks);
router.get('/stats/me', taskController.getMyTaskStats);
router.get('/:id', isValidObjectId('id'), taskController.getTaskById);
router.put('/:id', isValidObjectId('id'), taskController.updateTask);
router.patch('/:id', isValidObjectId('id'), taskController.updateTask);
router.delete('/:id', isValidObjectId('id'), taskController.deleteTask);
router.patch('/:id/status', isValidObjectId('id'), taskController.updateStatus);
router.patch('/:id/assign', isValidObjectId('id'), taskController.assignTask);
router.post('/:id/comments', isValidObjectId('id'), taskController.addComment);
router.get('/project/:projectId/stats', isValidObjectId('projectId'), requireProjectMember, taskController.getTaskStats);

export default router;
