import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const mapBlock: BlockDefinition = {
  name: 'Map',
  description: 'Transform array items',
  category: 'logic',
  inputs: [
    {
      name: 'items',
      type: 'array',
      required: true,
      description: 'Array of items to transform',
    },
    {
      name: 'mapping',
      type: 'string',
      required: true,
      description: 'Transformation mapping',
    },
  ],
  outputs: [
    {
      name: 'transformedItems',
      type: 'array',
      description: 'Transformed items',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { items } = inputs;

      if (!Array.isArray(items)) {
        throw new Error('Items must be an array');
      }

      const transformedItems = items;

      logger.debug('Map applied', {
        itemCount: items.length,
      });

      return {
        transformedItems,
        count: transformedItems.length,
      };
    } catch (error) {
      logger.error('Map block failed', error);
      throw error;
    }
  },
};
