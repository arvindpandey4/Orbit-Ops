import taskService from '../services/taskService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class TaskController {
    createTask = asyncHandler(async (req, res) => {
        const task = await taskService.createTask(req.body, req.user, req.app.get('io'));
        res.status(201).json({ success: true, message: 'Task created successfully', data: { task } });
    });

    getTasks = asyncHandler(async (req, res) => {
        const { page, limit } = req.pagination;
        const filters = req.filters || {};
        const sort = req.sort || { createdAt: -1 };
        const result = await taskService.getProjectTasks(req.query.project, { page, limit, sort, ...filters });
        res.json({ success: true, data: result });
    });

    getTaskById = asyncHandler(async (req, res) => {
        const task = await taskService.getTaskById(req.params.id);
        res.json({ success: true, data: { task } });
    });

    updateTask = asyncHandler(async (req, res) => {
        const task = await taskService.updateTask(req.params.id, req.body, req.user, req.app.get('io'));
        res.json({ success: true, message: 'Task updated successfully', data: { task } });
    });

    deleteTask = asyncHandler(async (req, res) => {
        await taskService.deleteTask(req.params.id, req.user, req.app.get('io'));
        res.json({ success: true, message: 'Task deleted successfully' });
    });

    updateStatus = asyncHandler(async (req, res) => {
        const { status, lateReason } = req.body;
        const task = await taskService.updateTaskStatus(req.params.id, status, lateReason, req.user, req.app.get('io'));
        res.json({ success: true, message: 'Task status updated successfully', data: { task } });
    });

    assignTask = asyncHandler(async (req, res) => {
        const { assignedTo } = req.body;
        const task = await taskService.assignTask(req.params.id, assignedTo, req.user, req.app.get('io'));
        res.json({ success: true, message: 'Task assigned successfully', data: { task } });
    });

    addComment = asyncHandler(async (req, res) => {
        const { text } = req.body;
        const task = await taskService.addComment(req.params.id, req.user, text, req.app.get('io'));
        res.json({ success: true, message: 'Comment added successfully', data: { task } });
    });

    getMyTasks = asyncHandler(async (req, res) => {
        const { page, limit } = req.pagination;
        const sort = req.sort || { createdAt: -1 };
        const result = await taskService.getUserTasks(req.user, { page, limit, sort });
        res.json({ success: true, data: result });
    });

    getMyTaskStats = asyncHandler(async (req, res) => {
        const stats = await taskService.getUserTaskStats(req.user);
        res.json({ success: true, data: { stats } });
    });

    getTaskStats = asyncHandler(async (req, res) => {
        const stats = await taskService.getTaskStats(req.params.projectId);
        res.json({ success: true, data: { stats } });
    });
}

export default new TaskController();
