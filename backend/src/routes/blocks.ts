import { Router } from 'express';
import { BLOCKS_LIST } from '../services/blocks';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, async (_req, res) => {
  try {
    const blocks = BLOCKS_LIST.map(block => ({
      type: Object.keys(require('../services/blocks').BLOCKS_REGISTRY).find(
        key => require('../services/blocks').BLOCKS_REGISTRY[key] === block
      ),
      name: block.name,
      description: block.description,
      category: block.category,
      inputs: block.inputs,
      outputs: block.outputs,
      creditsCost: block.creditsCost,
    }));

    res.json({
      success: true,
      data: {
        blocks,
        count: blocks.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blocks',
    });
  }
});

export default router;
