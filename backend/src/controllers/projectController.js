import projectService from '../services/projectService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class ProjectController {
    createProject = asyncHandler(async (req, res) => {
        const project = await projectService.createProject(req.body, req.user);
        res.status(201).json({ success: true, message: 'Project created successfully', data: { project } });
    });

    getProjects = asyncHandler(async (req, res) => {
        const { page, limit } = req.pagination;
        const sort = req.sort || { createdAt: -1 };
        const result = await projectService.getUserProjects(req.user, { page, limit, sort });
        res.json({ success: true, data: result });
    });

    getProjectById = asyncHandler(async (req, res) => {
        const project = await projectService.getProjectById(req.params.id);
        res.json({ success: true, data: { project } });
    });

    updateProject = asyncHandler(async (req, res) => {
        const project = await projectService.updateProject(req.params.id, req.body, req.user);
        res.json({ success: true, message: 'Project updated successfully', data: { project } });
    });

    deleteProject = asyncHandler(async (req, res) => {
        await projectService.deleteProject(req.params.id, req.user);
        res.json({ success: true, message: 'Project deleted successfully' });
    });

    archiveProject = asyncHandler(async (req, res) => {
        const project = await projectService.archiveProject(req.params.id, req.user._id);
        res.json({ success: true, message: 'Project archived successfully', data: { project } });
    });

    unarchiveProject = asyncHandler(async (req, res) => {
        const project = await projectService.unarchiveProject(req.params.id, req.user._id);
        res.json({ success: true, message: 'Project unarchived successfully', data: { project } });
    });

    addMember = asyncHandler(async (req, res) => {
        const { userId, role } = req.body;
        const project = await projectService.addMember(req.params.id, userId, role, req.user._id);
        res.json({ success: true, message: 'Member added successfully', data: { project } });
    });

    removeMember = asyncHandler(async (req, res) => {
        const project = await projectService.removeMember(req.params.id, req.params.userId, req.user._id);
        res.json({ success: true, message: 'Member removed successfully', data: { project } });
    });

    updateMemberRole = asyncHandler(async (req, res) => {
        const { role } = req.body;
        const project = await projectService.updateMemberRole(req.params.id, req.params.userId, role, req.user._id);
        res.json({ success: true, message: 'Member role updated successfully', data: { project } });
    });

    getProjectStats = asyncHandler(async (req, res) => {
        const stats = await projectService.getProjectStats(req.params.id);
        res.json({ success: true, data: { stats } });
    });
}

export default new ProjectController();
