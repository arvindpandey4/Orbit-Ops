import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters'],
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: [true, 'Project is required'],
        },
        assignedTo: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
        status: {
            type: String,
            enum: {
                values: ['Todo', 'In Progress', 'Done'],
                message: '{VALUE} is not a valid status',
            },
            default: 'Todo',
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium',
        },
        startDate: {
            type: Date,
            default: null,
        },
        dueDate: {
            type: Date,
            default: null,
        },
        tags: [{
            type: String,
            trim: true,
        }],
        attachments: [{
            name: String,
            url: String,
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
            uploadedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        }],
        comments: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            text: {
                type: String,
                required: true,
                maxlength: 1000,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],
        history: [{
            field: String,
            oldValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed,
            changedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            changedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        completedAt: {
            type: Date,
            default: null,
        },
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        lateReason: {
            type: String,
            default: null,
            trim: true,
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

// Indexes for performance and pagination
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ updatedAt: -1 });
taskSchema.index({ title: 'text', description: 'text' });

// Compound index for efficient queries
taskSchema.index({ project: 1, status: 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate || this.status === 'Done') {
        return false;
    }
    return new Date() > this.dueDate;
});

// Method to add comment
taskSchema.methods.addComment = function (userId, text) {
    this.comments.push({
        user: userId,
        text,
    });
    return this.save();
};

// Method to track changes
taskSchema.methods.trackChange = function (field, oldValue, newValue, userId) {
    this.history.push({
        field,
        oldValue,
        newValue,
        changedBy: userId,
    });
};

// Pre-save middleware to track status changes
taskSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        const oldStatus = this._original?.status;

        // Track status change
        if (oldStatus && oldStatus !== this.status) {
            this.history.push({
                field: 'status',
                oldValue: oldStatus,
                newValue: this.status,
                changedBy: this._changedBy,
            });
        }

        // Mark as completed
        if (this.status === 'Done' && oldStatus !== 'Done') {
            this.completedAt = new Date();
            this.completedBy = this._changedBy;
        }

        // Unmark completion if moved from Done
        if (this.status !== 'Done' && oldStatus === 'Done') {
            this.completedAt = null;
            this.completedBy = null;
        }
    }

    next();
});

// Post-init middleware to store original values
taskSchema.post('init', function () {
    this._original = this.toObject();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
