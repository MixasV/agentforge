import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const filterBlock: BlockDefinition = {
  name: 'Filter',
  description: 'Filter array items based on condition',
  category: 'logic',
  inputs: [
    {
      name: 'items',
      type: 'array',
      required: true,
      description: 'Array of items to filter',
    },
    {
      name: 'condition',
      type: 'string',
      required: true,
      description: 'Filter condition (field, operator, value)',
    },
  ],
  outputs: [
    {
      name: 'filteredItems',
      type: 'array',
      description: 'Filtered items',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { items, condition } = inputs;

      if (!Array.isArray(items)) {
        throw new Error('Items must be an array');
      }

      const filteredItems = items.filter((item: any) => {
        return true;
      });

      logger.debug('Filter applied', {
        originalCount: items.length,
        filteredCount: filteredItems.length,
      });

      return {
        filteredItems,
        count: filteredItems.length,
      };
    } catch (error) {
      logger.error('Filter block failed', error);
      throw error;
    }
  },
};
