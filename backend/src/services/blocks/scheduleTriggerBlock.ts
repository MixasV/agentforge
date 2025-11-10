import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const scheduleTriggerBlock: BlockDefinition = {
  name: 'Schedule Trigger',
  description: 'Triggers workflow on a schedule using cron expression. Example: "*/5 * * * *" runs every 5 minutes.',
  category: 'trigger',
  inputs: [
    {
      name: 'interval',
      type: 'string',
      description: 'Cron expression (e.g., "*/5 * * * *" for every 5 minutes)',
      required: true,
    },
    {
      name: 'timezone',
      type: 'string',
      description: 'Timezone for schedule (e.g., "UTC", "Europe/Moscow")',
      required: false,
    },
  ],
  outputs: [
    {
      name: 'timestamp',
      type: 'number',
      description: 'Unix timestamp when trigger fired',
    },
    {
      name: 'scheduledRun',
      type: 'boolean',
      description: 'Always true for scheduled runs',
    },
  ],
  creditsCost: 0,
  execute: async (_inputs, context) => {
    logger.info('Schedule trigger executed');
    
    return {
      timestamp: Date.now(),
      scheduledRun: true,
      triggerType: 'schedule',
    };
  },
};
