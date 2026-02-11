import rabbitmqClient from '../config/rabbitmq.js';
import emailService from '../services/emailService.js';
import logger from '../config/logger.js';

class EmailWorker {
    async start() {
        try {
            const channel = rabbitmqClient.getChannel();
            if (!channel) {
                logger.warn('RabbitMQ channel not available — Email Worker disabled');
                return;
            }

            const queue = 'email_queue';

            await channel.assertQueue(queue, { durable: true });
            channel.prefetch(1);

            logger.info('Email worker started, waiting for messages...');

            channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        const emailData = JSON.parse(msg.content.toString());
                        logger.info(`Processing email: ${emailData.type} to ${emailData.to}`);

                        switch (emailData.type) {
                            case 'welcome':
                                await emailService.sendWelcomeEmail(emailData.user);
                                break;
                            case 'invitation':
                                await emailService.sendInvitationEmail(emailData.data.user, emailData.data.temporaryPassword);
                                break;
                            case 'contact':
                                await emailService.sendContactEmail(emailData);
                                break;
                            case 'reset_password':
                                await emailService.sendPasswordResetEmail(emailData.user, emailData.resetUrl);
                                break;
                            case 'project_assignment':
                                await emailService.sendProjectAssignmentEmail(emailData.user, emailData.project, emailData.addedBy);
                                break;
                            case 'task_assignment':
                                await emailService.sendTaskAssignmentEmail(emailData.user, emailData.task, emailData.project);
                                break;
                            case 'admin_approval_request':
                                await emailService.sendAdminApprovalRequestEmail(emailData.admin, emailData.superAdmin);
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
                                await emailService.sendEmail(emailData);
                        }

                        channel.ack(msg);
                        logger.info(`Email sent successfully: ${emailData.type}`);
                    } catch (error) {
                        logger.error('Error processing email:', error);
                        channel.nack(msg, false, false); // Don't requeue failed messages
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to start email worker:', error);
            // Only retry if it was a setup error, but if channel is missing we already returned.
        }
    }
}

export default new EmailWorker();
