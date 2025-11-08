import { Router } from 'express';
import { BLOCKS_LIST, BLOCKS_REGISTRY } from '../services/blocks';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, async (_req, res) => {
  try {
    const blocks = BLOCKS_LIST.map(block => ({
      type: Object.keys(BLOCKS_REGISTRY).find(
        key => BLOCKS_REGISTRY[key] === block
      ),
      name: block.name,
      description: block.description,
      category: block.category,
      inputs: block.inputs,
      outputs: block.outputs,
      creditsCost: block.creditsCost,
    }));

    return res.json({
      success: true,
      data: {
        blocks,
        count: blocks.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch blocks',
    });
  }
});

export default router;
