import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const manualTriggerBlock: BlockDefinition = {
  name: 'Manual Trigger',
  description: 'Triggers workflow manually via API call or UI button. Accepts custom input data.',
  category: 'trigger',
  inputs: [
    {
      name: 'inputSchema',
      type: 'object',
      description: 'Optional JSON schema for expected input data',
      required: false,
    },
  ],
  outputs: [
    {
      name: 'manualRun',
      type: 'boolean',
      description: 'Always true for manual runs',
    },
    {
      name: 'timestamp',
      type: 'number',
      description: 'Unix timestamp when triggered',
    },
    {
      name: 'inputData',
      type: 'object',
      description: 'Custom data provided by user',
    },
  ],
  creditsCost: 0,
  execute: async (_inputs, context) => {
    logger.info('Manual trigger executed');
    
    return {
      manualRun: true,
      timestamp: Date.now(),
      inputData: context?.inputs || {},
    };
  },
};
