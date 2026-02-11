# Orbit Ops 🚀

[![Live Demo](https://img.shields.io/badge/Live_Demo-Orbit_Ops-success?style=for-the-badge&logo=vercel)](https://orbit-ops-ivory.vercel.app/)
[![Backend Status](https://img.shields.io/badge/Backend-Online-success?style=for-the-badge&logo=railway)](https://orbit-ops-production.up.railway.app/api/health)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Orbit Ops** is an enterprise-grade, event-driven task management system designed for high-performance teams. It seamlessly integrates real-time collaboration, robust role-based access control (RBAC), and automated workflows into a unified, scalable platform. Built with a production-first mindset, Orbit Ops leverages a microservices-ready architecture to ensure reliability, security, and speed.

---

## 🌟 Key Features

### 🔐 Enterprise Security & Authentication
- **Role-Based Access Control (RBAC)**: Granular permissions for Super Admin, Admin, Manager, and Member roles.
- **Secure Authentication**: JWT-based session management with Redis-backed token blacklisting.
- **OAuth Integration**: Seamless Google Sign-In support.
- **Advanced Security**: Rate limiting, Helmet.js headers, and input sanitization.

### ⚡ Real-Time Collaboration
- **Instant Updates**: Socket.IO integration for real-time task changes, assignments, and status updates.
- **Live Presence**: See who is online and active in the workspace instantly.
- **Interactive Dashboard**: Dynamic Kanban-style boards and list views for efficient task tracking.

### 🤖 Event-Driven Architecture
- **Asynchronous Processing**: RabbitMQ message queues handle background jobs (emails, logs) without blocking the main thread.
- **Microservices-Ready**: Decoupled services for scalability and maintainability.
- **Reliable Notifications**: Automated transactional emails for welcomes, task assignments, and project updates.

### 📊 Comprehensive Project Management
- **Smart Workspaces**: Organize tasks into projects with dedicated teams.
- **Task Lifecycle**: Full CRUD operations with detailed history, comments, and file attachments.
- **Performance Analytics**: Visual insights into team productivity and task completion rates.

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | React (Vite), TypeScript, Tailwind CSS, Framer Motion, Zustand |
| **Backend** | Node.js, Express.js, MongoDB Aggregations |
| **Infrastructure** | Docker, RabbitMQ (CloudAMQP), Redis (Stack via Railway) |
| **DevOps** | CI/CD (GitHub Actions), Railway (Backend), Vercel (Frontend) |
| **Real-Time** | Socket.IO, Redis Pub/Sub |

---

## 🚀 Live Deployment

The application is fully deployed and production-ready:

- **Frontend Application**: [https://orbit-ops-ivory.vercel.app/](https://orbit-ops-ivory.vercel.app/)
- **Backend API**: [https://orbit-ops-production.up.railway.app/](https://orbit-ops-production.up.railway.app/)

---

## 👨‍💻 Developer

**Arvind**  
*Lead Full-Stack Engineer*

---
*© 2026 Orbit Ops. Engineered for Excellence.*
