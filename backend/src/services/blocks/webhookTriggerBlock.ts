import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const webhookTriggerBlock: BlockDefinition = {
  name: 'Webhook Trigger',
  description: 'Triggers workflow when HTTP request is received at generated webhook URL. Supports GET and POST methods.',
  category: 'trigger',
  inputs: [
    {
      name: 'method',
      type: 'string',
      description: 'HTTP method to accept (GET or POST)',
      required: false,
    },
    {
      name: 'responseMode',
      type: 'string',
      description: 'Response mode: "immediate" or "wait" for workflow completion',
      required: false,
    },
  ],
  outputs: [
    {
      name: 'body',
      type: 'object',
      description: 'Request body (for POST requests)',
    },
    {
      name: 'query',
      type: 'object',
      description: 'Query parameters from URL',
    },
    {
      name: 'headers',
      type: 'object',
      description: 'HTTP request headers',
    },
    {
      name: 'webhookUrl',
      type: 'string',
      description: 'The webhook URL for this workflow',
    },
  ],
  creditsCost: 0,
  execute: async (_inputs, context) => {
    logger.info('Webhook trigger executed');
    
    const triggerData = context?.triggerData || {};
    
    return {
      body: triggerData.body || {},
      query: triggerData.query || {},
      headers: triggerData.headers || {},
      webhookUrl: triggerData.webhookUrl || '',
      triggerType: 'webhook',
    };
  },
};
