import rabbitmqClient from '../config/rabbitmq.js';
import activityLogRepository from '../repositories/activityLogRepository.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

class ActivityLogWorker {
    async start() {
        try {
            await rabbitmqClient.consume(
                config.rabbitmq.queues.activityLogs,
                this.processActivityLog.bind(this)
            );
            logger.info('Activity log worker started');
        } catch (error) {
            logger.error('Failed to start activity log worker:', error);
        }
    }

    async processActivityLog(activity) {
        try {
            await activityLogRepository.create(activity);
            logger.debug(`Activity logged: ${activity.action} by ${activity.user}`);
        } catch (error) {
            logger.error('Error processing activity log:', error);
            throw error; // Requeue message
        }
    }
}

export default new ActivityLogWorker();
