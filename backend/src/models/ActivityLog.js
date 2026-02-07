import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                'USER_CREATED',
                'USER_UPDATED',
                'USER_DELETED',
                'USER_LOGIN',
                'USER_LOGOUT',
                'PROJECT_CREATED',
                'PROJECT_UPDATED',
                'PROJECT_DELETED',
                'PROJECT_ARCHIVED',
                'PROJECT_MEMBER_ADDED',
                'PROJECT_MEMBER_REMOVED',
                'TASK_CREATED',
                'TASK_UPDATED',
                'TASK_DELETED',
                'TASK_STATUS_CHANGED',
                'TASK_ASSIGNED',
                'TASK_COMMENT_ADDED',
            ],
        },
        resource: {
            type: String,
            enum: ['User', 'Project', 'Task'],
            required: true,
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        ipAddress: {
            type: String,
            default: null,
        },
        userAgent: {
            type: String,
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
    }
);

// Indexes for performance
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

// TTL index to auto-delete logs older than 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
