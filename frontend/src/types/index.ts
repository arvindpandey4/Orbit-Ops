export interface User {
    _id: string;
    name: string;
    email: string;
    role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Member';
    avatar?: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Project {
    _id: string;
    name: string;
    description?: string;
    owner: User | string;
    members: ProjectMember[];
    status: 'Active' | 'Archived' | 'Completed';
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface ProjectMember {
    user: User | string;
    role: 'Admin' | 'Manager' | 'Member';
    addedAt: string;
    addedBy?: User | string;
}

export interface Task {
    _id: string;
    title: string;
    description?: string;
    project: Project | string;
    assignedTo?: (User | string)[];
    createdBy: User | string;
    status: 'Todo' | 'In Progress' | 'Done';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    startDate?: string;
    dueDate?: string;
    tags?: string[];
    comments: Comment[];
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    _id: string;
    user: User | string;
    text: string;
    createdAt: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        user: User;
        accessToken: string;
        refreshToken: string;
    };
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data: T;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface PresenceStatus {
    [userId: string]: 'online' | 'offline';
}
