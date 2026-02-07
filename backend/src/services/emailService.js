import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../config/logger.js';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            auth: config.email.auth,
        });
    }

    async sendEmail({ to, subject, html, text }) {
        try {
            const mailOptions = {
                from: config.email.from,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, ''),
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
            return info;
        } catch (error) {
            logger.error(`Failed to send email to ${to}:`, error);
            throw error;
        }
    }

    async sendWelcomeEmail(user) {
        const subject = 'Welcome to OrbitOps! 🚀';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background-color: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.6;
            padding: 20px;
        }
        .container { 
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .header { 
            text-align: center;
            padding: 40px 20px 30px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .title { 
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .subtitle {
            color: rgba(255,255,255,0.9);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .content { 
            padding: 40px 32px;
        }
        .greeting { 
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #1d1d1f;
        }
        .text { 
            color: #424245;
            line-height: 1.8;
            margin-bottom: 20px;
            font-size: 15px;
        }
        .info-box {
            background: #f5f5f7;
            border: 1px solid #e5e5e7;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
        }
        .info-box strong {
            color: #1d1d1f;
            display: block;
            margin-bottom: 12px;
            font-size: 16px;
        }
        .info-item {
            color: #1d1d1f;
            margin: 8px 0;
            font-size: 14px;
        }
        .info-label {
            color: #6e6e73;
            display: inline-block;
            width: 80px;
        }
        .button { 
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            margin-top: 24px;
            box-shadow: 0 4px 16px rgba(99,102,241,0.3);
            transition: all 0.3s ease;
        }
        .button:hover {
            box-shadow: 0 6px 24px rgba(99,102,241,0.4);
        }
        .footer { 
            text-align: center;
            padding: 32px 20px;
            background: #f5f5f7;
            border-top: 1px solid #e5e5e7;
        }
        .footer-text {
            color: #6e6e73;
            font-size: 13px;
            margin: 8px 0;
        }
        .footer-brand {
            color: #1d1d1f;
            font-size: 14px;
            margin: 12px 0 8px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; line-height: 1; margin-bottom: 10px; color: #ffffff;">⌘</div>
            <h1 class="title">OrbitOps</h1>
            <p class="subtitle">Mission Control System</p>
        </div>
        
        <div class="content">
            <h2 class="greeting">Welcome aboard, ${user.name}! 👋</h2>
            
            <p class="text">
                Your OrbitOps account has been successfully created. You're now part of a mission-critical task management system designed for teams that aim for the stars.
            </p>
            
            <div class="info-box">
                <strong>Your Account Details:</strong>
                <div class="info-item">
                    <span class="info-label">Email:</span> ${user.email}
                </div>
                <div class="info-item">
                    <span class="info-label">Role:</span> ${user.role}
                </div>
                <div class="info-item">
                    <span class="info-label">Status:</span> ${user.isActive ? 'Active ✅' : 'Pending Activation ⏳'}
                </div>
            </div>
            
            <p class="text">
                Get started by logging into your command center and exploring all the powerful features OrbitOps has to offer.
            </p>
            
            <center>
                <a href="${config.frontendUrl}/login" class="button">Launch Command Center →</a>
            </center>
        </div>
        
        <div class="footer">
            <p class="footer-brand">Made with ❤️ by Arvind Pandey</p>
            <p class="footer-text">© 2026 OrbitOps. All rights reserved.</p>
            <p class="footer-text">This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
        `;

        return this.sendEmail({
            to: user.email,
            subject,
            html,
        });
    }

    async sendInvitationEmail(user, temporaryPassword) {
        const subject = 'You\'ve been invited to OrbitOps! 🎉';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background-color: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.6;
            padding: 20px;
        }
        .container { 
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a24 0%, #13131a 100%);
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .header { 
            text-align: center;
            padding: 40px 20px 30px;
            background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .title { 
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .subtitle {
            color: rgba(255,255,255,0.9);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .content { 
            padding: 40px 32px;
        }
        .greeting { 
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #1d1d1f;
        }
        .text { 
            color: #424245;
            line-height: 1.8;
            margin-bottom: 20px;
            font-size: 15px;
        }
        .credentials-box {
            background: rgba(34,197,94,0.1);
            border: 1px solid rgba(34,197,94,0.2);
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
        }
        .credentials-box strong {
            color: #ffffff;
            display: block;
            margin-bottom: 12px;
            font-size: 16px;
        }
        .credential-item {
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            padding: 12px 16px;
            margin: 8px 0;
            font-family: 'Courier New', monospace;
        }
        .credential-label {
            color: #a1a1aa;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }
        .credential-value {
            color: #22c55e;
            font-size: 16px;
            font-weight: 600;
        }
        .warning-box {
            background: rgba(251,191,36,0.1);
            border: 1px solid rgba(251,191,36,0.2);
            border-radius: 12px;
            padding: 16px;
            margin: 24px 0;
        }
        .warning-box p {
            color: #fbbf24;
            font-size: 14px;
            margin: 0;
        }
        .button { 
            display: inline-block;
            background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            margin-top: 24px;
            box-shadow: 0 4px 16px rgba(34,197,94,0.3);
            transition: all 0.3s ease;
        }
        .button:hover {
            box-shadow: 0 6px 24px rgba(34,197,94,0.4);
        }
        .footer { 
            text-align: center;
            padding: 32px 20px;
            background: rgba(0,0,0,0.2);
            border-top: 1px solid rgba(255,255,255,0.05);
        }
        .footer-text {
            color: #71717a;
            font-size: 13px;
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; line-height: 1; margin-bottom: 10px; color: #ffffff;">⌘</div>
            <h1 class="title">Team Invitation</h1>
            <p class="subtitle">OrbitOps Mission Control</p>
        </div>
        
        <div class="content">
            <h2 class="greeting">Welcome to the team, ${user.name}! 🚀</h2>
            
            <p class="text">
                You've been invited to join OrbitOps as a <strong style="color: #22c55e;">${user.role}</strong>. Your account has been created and is ready to use.
            </p>
            
            <div class="credentials-box">
                <strong>🔑 Your Login Credentials:</strong>
                <div class="credential-item">
                    <div class="credential-label">Email Address</div>
                    <div class="credential-value">${user.email}</div>
                </div>
                <div class="credential-item">
                    <div class="credential-label">Temporary Password</div>
                    <div class="credential-value">${temporaryPassword}</div>
                </div>
            </div>
            
            <div class="warning-box">
                <p>⚠️ <strong>Important:</strong> Please change your password immediately after your first login for security purposes.</p>
            </div>
            
            <p class="text">
                Click the button below to access your command center and get started with your team.
            </p>
            
            <center>
                <a href="${config.frontendUrl}/login" class="button">Access Command Center →</a>
            </center>
        </div>
        
        <div class="footer">
            <p class="footer-brand">Made with ❤️ by Arvind Pandey</p>
            <p class="footer-text">© 2026 OrbitOps. All rights reserved.</p>
            <p class="footer-text">This is an automated invitation. If you didn't expect this, please contact your administrator.</p>
        </div>
    </div>
</body>
</html>
        `;

        return this.sendEmail({
            to: user.email,
            subject,
            html,
        });
    }

    async sendContactEmail({ name, email, message }) {
        const subject = `New Contact Form Submission from ${name}`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 20px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #333; }
        .value { color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="color: #6366f1; margin: 0;">New Contact Form Submission</h2>
        </div>
        <div class="field">
            <div class="label">Name:</div>
            <div class="value">${name}</div>
        </div>
        <div class="field">
            <div class="label">Email:</div>
            <div class="value">${email}</div>
        </div>
        <div class="field">
            <div class="label">Message:</div>
            <div class="value">${message}</div>
        </div>
    </div>
</body>
</html>
        `;

        return this.sendEmail({
            to: config.admin.email,
            subject,
            html,
        });
    }

    async sendPasswordResetEmail({ email, name }, resetUrl) {
        const subject = 'Password Reset Request - OrbitOps 🔐';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background-color: #0a0a0f;
            color: #ffffff;
            line-height: 1.6;
            padding: 20px;
        }
        .container { 
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a24 0%, #13131a 100%);
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .header { 
            text-align: center;
            padding: 40px 20px 30px;
            background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(249,115,22,0.1) 100%);
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .title { 
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }
        .content { 
            padding: 40px 32px;
        }
        .text { 
            color: #a1a1aa;
            line-height: 1.8;
            margin-bottom: 20px;
            font-size: 15px;
        }
        .button { 
            display: inline-block;
            background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            margin-top: 24px;
            box-shadow: 0 4px 16px rgba(239,68,68,0.3);
            transition: all 0.3s ease;
        }
        .button:hover {
            box-shadow: 0 6px 24px rgba(239,68,68,0.4);
        }
        .footer { 
            text-align: center;
            padding: 32px 20px;
            background: rgba(0,0,0,0.2);
            border-top: 1px solid rgba(255,255,255,0.05);
        }
        .footer-text {
            color: #71717a;
            font-size: 13px;
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; line-height: 1; margin-bottom: 10px; color: #ffffff;">⌘</div>
            <h1 class="title">Secure Reset</h1>
        </div>
        
        <div class="content">
            <p class="text">Hello ${name},</p>
            <p class="text">
                We received a request to reset your password for your OrbitOps account. If you didn't make this request, you can safely ignore this email.
            </p>
            
            <p class="text">
                To reset your password, click the secure link below. This link will expire in 10 minutes.
            </p>
            
            <center>
                <a href="${resetUrl}" class="button">Reset Password →</a>
            </center>
        </div>
        
        <div class="footer">
            <p class="footer-text">© 2026 OrbitOps Systems.</p>
            <p class="footer-text">If the button doesn't work, copy and paste this link:</p>
            <p class="footer-text" style="word-break: break-all;">${resetUrl}</p>
        </div>
    </div>
</body>
</html>
        `;

        return this.sendEmail({
            to: email,
            subject,
            html,
        });
    }
    async sendProjectAssignmentEmail(user, project, addedBy) {
        const subject = `New Project Assignment: ${project.name} 🚀`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background-color: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.6;
            padding: 20px;
        }
        .container { 
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .header { 
            text-align: center;
            padding: 40px 20px 30px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .title { 
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .subtitle {
            color: rgba(255,255,255,0.9);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .content { 
            padding: 40px 32px;
        }
        .greeting { 
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #1d1d1f;
        }
        .text { 
            color: #424245;
            line-height: 1.8;
            margin-bottom: 20px;
            font-size: 15px;
        }
        .info-box {
            background: #f5f5f7;
            border: 1px solid #e5e5e7;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
        }
        .info-box strong {
            color: #1d1d1f;
            display: block;
            margin-bottom: 12px;
            font-size: 16px;
        }
        .info-item {
            color: #1d1d1f;
            margin: 8px 0;
            font-size: 14px;
        }
        .info-label {
            color: #6e6e73;
            display: inline-block;
            width: 80px;
        }
        .button { 
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            margin-top: 24px;
            box-shadow: 0 4px 16px rgba(99,102,241,0.3);
            transition: all 0.3s ease;
        }
        .button:hover {
            box-shadow: 0 6px 24px rgba(99,102,241,0.4);
        }
        .footer { 
            text-align: center;
            padding: 32px 20px;
            background: #f5f5f7;
            border-top: 1px solid #e5e5e7;
        }
        .footer-text {
            color: #6e6e73;
            font-size: 13px;
            margin: 8px 0;
        }
        .footer-brand {
            color: #1d1d1f;
            font-size: 14px;
            margin: 12px 0 8px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; line-height: 1; margin-bottom: 10px; color: #ffffff;">⌘</div>
            <h1 class="title">Project Update</h1>
            <p class="subtitle">OrbitOps Mission Control</p>
        </div>
        
        <div class="content">
            <h2 class="greeting">Hello ${user.name},</h2>
            
            <p class="text">
                You were added in <strong>${project.name}</strong> project by ${addedBy}. You will be assigned your task soon.
            </p>
            
            <div class="info-box">
                <strong>Project Details:</strong>
                <div class="info-item">
                    <span class="info-label">Project:</span> ${project.name}
                </div>
                <div class="info-item">
                    <span class="info-label">Role:</span> Member
                </div>
            </div>
            
            <center>
                <a href="${config.frontendUrl}/projects" class="button">View Project →</a>
            </center>
        </div>
        
        <div class="footer">
            <p class="footer-brand">Made with ❤️ by Arvind Pandey</p>
            <p class="footer-text">© 2026 OrbitOps. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;

        return this.sendEmail({
            to: user.email,
            subject,
            html,
        });
    }

    async sendTaskAssignmentEmail(user, task, project) {
        const subject = `New Task Assignment: ${task.title} 📋`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background-color: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.6;
            padding: 20px;
        }
        .container { 
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .header { 
            text-align: center;
            padding: 40px 20px 30px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .title { 
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .subtitle {
            color: rgba(255,255,255,0.9);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .content { 
            padding: 40px 32px;
        }
        .greeting { 
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #1d1d1f;
        }
        .text { 
            color: #424245;
            line-height: 1.8;
            margin-bottom: 20px;
            font-size: 15px;
        }
        .info-box {
            background: #f5f5f7;
            border: 1px solid #e5e5e7;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
        }
        .info-box strong {
            color: #1d1d1f;
            display: block;
            margin-bottom: 12px;
            font-size: 16px;
        }
        .info-item {
            color: #1d1d1f;
            margin: 8px 0;
            font-size: 14px;
        }
        .info-label {
            color: #6e6e73;
            display: inline-block;
            width: 80px;
        }
        .button { 
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 600;
            margin-top: 24px;
            box-shadow: 0 4px 16px rgba(99,102,241,0.3);
            transition: all 0.3s ease;
        }
        .button:hover {
            box-shadow: 0 6px 24px rgba(99,102,241,0.4);
        }
        .footer { 
            text-align: center;
            padding: 32px 20px;
            background: #f5f5f7;
            border-top: 1px solid #e5e5e7;
        }
        .footer-text {
            color: #6e6e73;
            font-size: 13px;
            margin: 8px 0;
        }
        .footer-brand {
            color: #1d1d1f;
            font-size: 14px;
            margin: 12px 0 8px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; line-height: 1; margin-bottom: 10px; color: #ffffff;">⌘</div>
            <h1 class="title">New Task</h1>
            <p class="subtitle">OrbitOps Mission Control</p>
        </div>
        
        <div class="content">
            <h2 class="greeting">Task Assignment Received</h2>
            
            <p class="text">
                A new task has been assigned to you in the <strong>${project.name}</strong> project.
            </p>
            
            <div class="info-box">
                <strong>Task Details:</strong>
                <div class="info-item">
                    <span class="info-label">Title:</span> ${task.title}
                </div>
                <div class="info-item">
                    <span class="info-label">Priority:</span> ${task.priority}
                </div>
                <div class="info-item">
                    <span class="info-label">Due Date:</span> ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                </div>
            </div>
            
            <div class="info-box" style="background: #eef2ff; border-color: #d1d5db;">
                <strong>Description:</strong>
                <p class="text" style="font-size: 14px; margin-top: 8px;">
                    ${task.description}
                </p>
            </div>
            
            <center>
                <a href="${config.frontendUrl}/tasks" class="button">View Task →</a>
            </center>
        </div>
        
        <div class="footer">
            <p class="footer-brand">Made with ❤️ by Arvind Pandey</p>
            <p class="footer-text">© 2026 OrbitOps. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;

        return this.sendEmail({
            to: user.email,
            subject,
            html,
        });
    }
    async sendAdminApprovalRequestEmail(admin, superAdmin) {
        const subject = 'Action Required: New Admin Access Request 🛡️';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif; background-color: #f5f5f7; color: #1d1d1f; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; }
        .title { color: white; margin: 0; font-size: 24px; font-weight: bold; }
        .content { padding: 30px; }
        .info-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .item { margin: 5px 0; font-size: 14px; }
        .label { font-weight: bold; color: #92400e; width: 80px; display: inline-block; }
        .button { display: inline-block; background: #f59e0b; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; line-height: 1; margin-bottom: 10px; color: #ffffff;">⌘</div>
            <h1 class="title">New Admin Request</h1>
        </div>
        <div class="content">
            <p>Hello ${superAdmin.name},</p>
            <p>A new user has requested <strong>Admin</strong> access to OrbitOps.</p>
            
            <div class="info-box">
                <div class="item"><span class="label">Name:</span> ${admin.name}</div>
                <div class="item"><span class="label">Email:</span> ${admin.email}</div>
                <div class="item"><span class="label">Role:</span> Admin (Pending)</div>
            </div>
            
            <p>Please review and approve or reject this request in the Teams dashboard.</p>
            
            <center>
                <a href="${config.frontendUrl}/dashboard/teams" class="button">Review Request</a>
            </center>
        </div>
    </div>
</body>
</html>`;
        return this.sendEmail({ to: superAdmin.email, subject, html });
    }

    async sendAccountPendingEmail(user) {
        const subject = 'Account Activation Pending ⏳';
        // Using the same consistent design as other emails
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background-color: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.6;
            padding: 20px;
        }
        .container { 
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .header { 
            text-align: center;
            padding: 40px 20px 30px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .title { 
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .subtitle {
            color: rgba(255,255,255,0.9);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .content { 
            padding: 40px 32px;
        }
        .text {
            color: #374151;
            font-size: 16px;
            margin-bottom: 24px;
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: left;
        }
        .footer {
            text-align: center;
            padding: 24px;
            background: #f5f5f7;
            border-top: 1px solid #e5e5e7;
        }
        .footer-text {
            color: #6e6e73;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; line-height: 1; margin-bottom: 10px; color: #ffffff;">⌘</div>
            <h1 class="title">Pending Approval</h1>
            <p class="subtitle">OrbitOps Mission Control</p>
        </div>
        
        <div class="content">

            <p class="text">
                Hello ${user.name},
            </p>
            <p class="text">
                Your account has been successfully created but is currently <strong>pending activation</strong>. 
                An administrator needs to review and approve your request before you can access the system.
            </p>
            
            <div class="info-box">
                <p style="margin: 0; color: #64748b; font-size: 14px;">Status:</p>
                <strong style="color: #eab308; font-size: 18px;">Pending Review</strong>
            </div>

            <p class="text">
                You will receive another email once your account has been approved and activated.
            </p>
        </div>

        <div class="footer">
            <p class="footer-text">© ${new Date().getFullYear()} OrbitOps. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
        return this.sendEmail({ to: user.email, subject, html });
    }

    async sendAdminPendingEmail(user) {
        const subject = 'Admin Access Requested - Pending Approval ⏳';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, sans-serif; background: #f5f5f7; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        h1 { color: #d97706; margin-bottom: 20px; }
        p { color: #374151; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <div style="font-size: 48px; color: #d97706; margin-bottom: 20px;">⌘</div>
        <h1>Verification Pending</h1>
        <p>Hello ${user.name},</p>
        <p>Your request for Admin access has been received and is currently pending approval by a Super Admin.</p>
        <p>You will receive another email once your account status has been updated. You cannot log in until then.</p>
        <p>Thank you for your patience.</p>
    </div>
</body>
</html>`;
        return this.sendEmail({ to: user.email, subject, html });
    }

    async sendAdminApprovedEmail(user) {
        const subject = 'Admin Access Approved! 🚀';
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, sans-serif; background: #f5f5f7; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }

        h1 { color: #16a34a; margin-bottom: 20px; }
        p { color: #374151; line-height: 1.6; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div style="font-size: 48px; color: #16a34a; margin-bottom: 20px;">⌘</div>
        <h1>Access Approved</h1>
        <p>Hello ${user.name},</p>
        <p>Congratulations! Your request for Admin access has been <strong>approved</strong>.</p>
        <p>You now have full access to the OrbitOps Admin Dashboard.</p>
        
        <a href="${config.frontendUrl}/login" class="button">Log In Now</a>
    </div>
</body>
</html>`;
        return this.sendEmail({ to: user.email, subject, html });
    }
}

export default new EmailService();
