import rabbitmqClient from '../config/rabbitmq.js';
import emailService from '../services/emailService.js';
import logger from '../config/logger.js';

/**
 * Email Queue Manager
 * Handles email sending with automatic fallback:
 * 1. Try RabbitMQ (async queue) if available
 * 2. Fallback to direct SMTP if RabbitMQ is unavailable
 */
class EmailQueueManager {
    /**
     * Send email with automatic fallback
     * @param {Object} emailPayload - Email payload with type and data
     * @returns {Promise<boolean>} - Success status
     */
    async sendEmail(emailPayload) {
        try {
            // Try RabbitMQ first (async processing)
            const queued = await rabbitmqClient.publishEmail(emailPayload);

            if (queued) {
                logger.info(`Email queued via RabbitMQ: ${emailPayload.type} to ${emailPayload.to || emailPayload.user?.email}`);
                return true;
            }

            // Fallback to direct SMTP
            logger.warn(`RabbitMQ unavailable, sending email directly via SMTP: ${emailPayload.type}`);
            await this.sendDirectEmail(emailPayload);
            return true;

        } catch (error) {
            logger.error(`Failed to send email (${emailPayload.type}):`, error);
            return false;
        }
    }

    /**
     * Send email directly via SMTP (synchronous)
     * @param {Object} emailData - Email payload
     */
    async sendDirectEmail(emailData) {
        switch (emailData.type) {
            case 'welcome':
                await emailService.sendWelcomeEmail(emailData.user);
                break;

            case 'invitation':
                await emailService.sendInvitationEmail(
                    emailData.data.user,
                    emailData.data.temporaryPassword
                );
                break;

            case 'contact':
                await emailService.sendContactEmail(emailData);
                break;

            case 'reset_password':
                await emailService.sendPasswordResetEmail(
                    emailData.user,
                    emailData.resetUrl
                );
                break;

            case 'project_assignment':
                await emailService.sendProjectAssignmentEmail(
                    emailData.user,
                    emailData.project,
                    emailData.addedBy
                );
                break;

            case 'task_assignment':
                await emailService.sendTaskAssignmentEmail(
                    emailData.user,
                    emailData.task,
                    emailData.project
                );
                break;

            case 'admin_approval_request':
                await emailService.sendAdminApprovalRequestEmail(
                    emailData.admin,
                    emailData.superAdmin
                );
                break;

            case 'admin_pending':
                await emailService.sendAdminPendingEmail(emailData.user);
                break;

            case 'account_pending':
                await emailService.sendAccountPendingEmail(emailData.user);
                break;

            case 'admin_approved':
                await emailService.sendAdminApprovedEmail(emailData.user);
                break;

            default:
                // Generic email
                await emailService.sendEmail(emailData);
        }

        logger.info(`Email sent directly via SMTP: ${emailData.type}`);
    }

    /**
     * Check if RabbitMQ is available
     * @returns {boolean}
     */
    isRabbitMQAvailable() {
        return rabbitmqClient.isAvailable();
    }
}

export default new EmailQueueManager();
