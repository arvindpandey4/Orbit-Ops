import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Project name is required'],
            trim: true,
            minlength: [3, 'Project name must be at least 3 characters'],
            maxlength: [100, 'Project name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Project owner is required'],
        },
        members: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                role: {
                    type: String,
                    enum: ['Admin', 'Manager', 'Member'],
                    default: 'Member',
                },
                addedAt: {
                    type: Date,
                    default: Date.now,
                },
                addedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            },
        ],
        status: {
            type: String,
            enum: ['Active', 'Archived', 'Completed'],
            default: 'Active',
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: {
            type: Date,
            default: null,
        },
        tags: [{
            type: String,
            trim: true,
        }],
        archivedAt: {
            type: Date,
            default: null,
        },
        archivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
        },
    }
);

// Indexes for performance
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });

// Virtual for project's tasks
projectSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'project',
});

// Method to check if user is a member
projectSchema.methods.isMember = function (userId) {
    return this.members.some(member => member.user.toString() === userId.toString());
};

// Method to get member role
projectSchema.methods.getMemberRole = function (userId) {
    const member = this.members.find(m => m.user.toString() === userId.toString());
    return member ? member.role : null;
};

// Method to check if user has permission
projectSchema.methods.hasPermission = function (userId, requiredRole) {
    const memberRole = this.getMemberRole(userId);
    if (!memberRole) return false;

    const roleHierarchy = { Admin: 3, Manager: 2, Member: 1 };
    return roleHierarchy[memberRole] >= roleHierarchy[requiredRole];
};

// Method to add member
projectSchema.methods.addMember = function (userId, role, addedBy) {
    if (this.isMember(userId)) {
        throw new Error('User is already a member of this project');
    }

    this.members.push({
        user: userId,
        role: role || 'Member',
        addedBy,
    });

    return this.save();
};

// Method to remove member
projectSchema.methods.removeMember = function (userId) {
    this.members = this.members.filter(m => m.user.toString() !== userId.toString());
    return this.save();
};

// Method to update member role
projectSchema.methods.updateMemberRole = function (userId, newRole) {
    const member = this.members.find(m => m.user.toString() === userId.toString());
    if (!member) {
        throw new Error('User is not a member of this project');
    }
    member.role = newRole;
    return this.save();
};

// Method to archive project
projectSchema.methods.archive = function (userId) {
    this.status = 'Archived';
    this.archivedAt = new Date();
    this.archivedBy = userId;
    return this.save();
};

// Method to unarchive project
projectSchema.methods.unarchive = function () {
    this.status = 'Active';
    this.archivedAt = null;
    this.archivedBy = null;
    return this.save();
};

const Project = mongoose.model('Project', projectSchema);

export default Project;
