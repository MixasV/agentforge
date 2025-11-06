import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const conditionalBlock: BlockDefinition = {
  name: 'Conditional',
  description: 'Route flow based on condition',
  category: 'logic',
  inputs: [
    {
      name: 'condition',
      type: 'boolean',
      required: true,
      description: 'Condition to evaluate',
    },
    {
      name: 'trueValue',
      type: 'object',
      required: false,
      description: 'Value if condition is true',
    },
    {
      name: 'falseValue',
      type: 'object',
      required: false,
      description: 'Value if condition is false',
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'object',
      description: 'Result based on condition',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { condition, trueValue = {}, falseValue = {} } = inputs;

      const result = condition ? trueValue : falseValue;

      logger.debug('Conditional evaluated', { condition });

      return {
        result,
        conditionMet: !!condition,
      };
    } catch (error) {
      logger.error('Conditional block failed', error);
      throw error;
    }
  },
};
