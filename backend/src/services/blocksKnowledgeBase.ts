/**
 * Blocks Knowledge Base (BLOCKS_KB)
 * 
 * Centralized system for generating LLM documentation about available blocks.
 * This allows us to update block descriptions without modifying AI Assistant prompts.
 * 
 * Design principles:
 * 1. Single source of truth - all block info comes from BLOCKS_REGISTRY
 * 2. Easy to extend - add new blocks, they auto-appear in AI docs
 * 3. Context-aware - can filter blocks by category, use case, etc.
 * 4. Examples included - real-world usage patterns for each block
 */

import { BLOCKS_REGISTRY } from './blocks';
import { BlockDefinition } from '../types';

interface BlockDocumentation {
  type: string;
  name: string;
  description: string;
  category: string;
  creditsCost: number;
  inputs: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }[];
  outputs: {
    name: string;
    type: string;
    description?: string;
  }[];
  usageNotes?: string;
  exampleConfig?: Record<string, any>;
  commonPatterns?: string[];
}

interface BlockCategory {
  name: string;
  description: string;
  icon: string;
  blocks: BlockDocumentation[];
}

/**
 * Generate structured documentation for all blocks
 */
export function generateBlocksDocumentation(): BlockDocumentation[] {
  return Object.entries(BLOCKS_REGISTRY).map(([type, block]) => {
    const doc: BlockDocumentation = {
      type,
      name: block.name,
      description: block.description,
      category: block.category,
      creditsCost: block.creditsCost,
      inputs: block.inputs.map(input => ({
        name: input.name,
        type: input.type,
        required: input.required,
        description: input.description,
      })),
      outputs: block.outputs.map(output => ({
        name: output.name,
        type: output.type,
        description: output.description,
      })),
    };

    // Add special usage notes and patterns
    addUsageNotes(doc);

    return doc;
  });
}

/**
 * Add usage notes and common patterns for specific blocks
 */
function addUsageNotes(doc: BlockDocumentation): void {
  const usageGuides: Record<string, {
    notes: string;
    exampleConfig?: Record<string, any>;
    patterns?: string[];
  }> = {
    ai_agent: {
      notes: `
🌟 RECOMMENDED FOR COMPLEX WORKFLOWS!
This is a UNIVERSAL AI AGENT (like n8n AI Agent) that can:
- Use ANY block as a tool (not just hardcoded ones!)
- Make intelligent decisions about which tools to call
- Chain multiple tool calls to complete tasks
- Orchestrate complex workflows autonomously

ENABLED TOOLS OPTIONS:
1. Specific blocks: "send_telegram,jupiter_token_info,jupiter_swap_quote,pump_fun_data"
2. Category wildcards: "data*" (all data blocks), "action*" (all action blocks)
3. All blocks: "all" (every non-trigger block becomes a tool)

For most Telegram bots: Telegram Trigger → AI Agent (2 blocks!)
The agent handles data fetching, processing, and responses internally.`,
      exampleConfig: {
        prompt: '{{messageText}}',
        systemMessage: 'You are a helpful Solana trading assistant. Use tools to fetch token data and respond to user queries.',
        chatId: '{{chatId}}',
        botToken: '{{env.TELEGRAM_BOT_TOKEN}}',
        enabledTools: 'send_telegram,jupiter_token_info,jupiter_swap_quote,pump_fun_data,helius_balance',
        model: 'gpt-4o-mini',
      },
      patterns: [
        'Telegram Trigger → AI Agent with enabledTools="all" (complete bot)',
        'Telegram Trigger → AI Agent with enabledTools="data*,send_telegram" (data bot)',
        'Manual Trigger → AI Agent → Log results',
      ],
    },
    telegram_trigger: {
      notes: `
📱 ALWAYS START TELEGRAM BOTS WITH THIS BLOCK
Outputs {{chatId}}, {{userId}}, {{messageText}} that can be used in following blocks.
Bot token can be configured here OR in Settings (recommended).`,
      exampleConfig: {
        botToken: '{{env.TELEGRAM_BOT_TOKEN}}',
      },
      patterns: [
        'Telegram Trigger → AI Agent (most common)',
        'Telegram Trigger → LLM Analysis → Send Telegram',
      ],
    },
    send_telegram: {
      notes: `
Use {{chatId}} from Telegram Trigger to respond to the same chat.
Bot token can be hardcoded, from Settings, or from environment variables.`,
      exampleConfig: {
        botToken: '{{env.TELEGRAM_BOT_TOKEN}}',
        chatId: '{{chatId}}',
        message: 'Your response here',
      },
      patterns: [
        'Get data → Send Telegram (send results)',
        'AI Agent → Send Telegram (agent handles both)',
      ],
    },
    llm_analysis: {
      notes: `
Use for text processing, summarization, extraction, classification.
NOT needed if using AI Agent (agent has LLM built-in).`,
      exampleConfig: {
        systemPrompt: 'Extract token address from user message',
        userPrompt: '{{messageText}}',
        model: 'gpt-4o-mini',
      },
      patterns: [
        'Telegram Trigger → LLM Analysis → Conditional → Actions',
        'Data blocks → LLM Analysis → Send Telegram (summarize results)',
      ],
    },
    jupiter_token_info: {
      notes: `
🔍 TOKEN INFO & SAFETY ANALYSIS - Use FIRST!
Search any Solana token by symbol/name/mint.

RETURNS: price, mcap, liquidity, holders
⚠️ AUDIT: mintAuthorityDisabled, freezeAuthorityDisabled, topHoldersPercentage, devBalancePercentage, organicScore

Examples: query="SOL", "USDC"`,
      exampleConfig: { query: 'SOL' },
      patterns: ['User asks price → jupiter_token_info'],
    },
    jupiter_swap_quote: {
      notes: `
💱 SWAP QUOTE - Needs mint addresses!
Gets best swap route & output amount.
⚠️ Use jupiter_token_info FIRST to get mints.
Amount in RAW: 1 SOL = 1000000000`,
      exampleConfig: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '1000000',
      },
      patterns: [
        'Get mints → jupiter_swap_quote',
      ],
    },
  };

  const guide = usageGuides[doc.type];
  if (guide) {
    doc.usageNotes = guide.notes;
    doc.exampleConfig = guide.exampleConfig;
    doc.commonPatterns = guide.patterns;
  }
}

/**
 * Generate LLM-optimized prompt section for blocks documentation
 */
export function generateLLMBlocksPrompt(options?: {
  emphasizeBlocks?: string[]; // Block types to highlight
  useCase?: 'telegram_bot' | 'trading' | 'data_processing' | 'general';
}): string {
  const blocks = generateBlocksDocumentation();
  
  // Group by category
  const categories: Record<string, BlockCategory> = {
    trigger: {
      name: '🎯 TRIGGERS',
      description: 'Start workflows based on events',
      icon: '⚡',
      blocks: [],
    },
    ai: {
      name: '🤖 AI & AGENTS',
      description: 'Intelligent processing and decision making',
      icon: '🧠',
      blocks: [],
    },
    action: {
      name: '⚡ ACTIONS',
      description: 'Send messages, execute trades, etc.',
      icon: '📤',
      blocks: [],
    },
    data: {
      name: '📊 DATA',
      description: 'Fetch information from APIs',
      icon: '🔍',
      blocks: [],
    },
    logic: {
      name: '🔀 LOGIC',
      description: 'Control flow, conditions, loops',
      icon: '🔁',
      blocks: [],
    },
  };

  // Categorize blocks
  blocks.forEach(block => {
    const category = categories[block.category];
    if (category) {
      category.blocks.push(block);
    }
  });

  let prompt = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  prompt += '📦 AVAILABLE BLOCKS\n';
  prompt += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Add special recommendations based on use case
  if (options?.useCase === 'telegram_bot') {
    prompt += `💡 FOR TELEGRAM BOTS - RECOMMENDED APPROACH:
Telegram Trigger → AI Agent (2 blocks!)

The AI Agent block is a complete autonomous assistant that:
- Understands user messages intelligently
- Fetches data using built-in tools
- Sends responses automatically

You DON'T need separate LLM, Data, or Send blocks!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  // Emphasized blocks first
  if (options?.emphasizeBlocks && options.emphasizeBlocks.length > 0) {
    prompt += '⭐ KEY BLOCKS FOR YOUR USE CASE:\n\n';
    options.emphasizeBlocks.forEach(type => {
      const block = blocks.find(b => b.type === type);
      if (block) {
        prompt += formatBlockDocumentation(block, true);
      }
    });
    prompt += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  }

  // All blocks by category
  Object.values(categories).forEach(category => {
    if (category.blocks.length === 0) return;

    prompt += `${category.name}\n`;
    prompt += `${category.description}\n\n`;

    category.blocks.forEach(block => {
      // Skip if already shown in emphasized section
      if (options?.emphasizeBlocks?.includes(block.type)) {
        return;
      }
      prompt += formatBlockDocumentation(block, false);
    });

    prompt += '\n';
  });

  return prompt;
}

/**
 * Format single block documentation for LLM prompt
 */
function formatBlockDocumentation(block: BlockDocumentation, detailed: boolean): string {
  let doc = `  • ${block.name} (${block.type})`;
  
  if (block.creditsCost > 0) {
    doc += ` [${block.creditsCost} credits]`;
  }
  
  doc += `\n    ${block.description}\n`;

  if (detailed || block.usageNotes) {
    if (block.usageNotes) {
      doc += `\n${block.usageNotes}\n`;
    }

    // Show required inputs
    const requiredInputs = block.inputs.filter(i => i.required);
    if (requiredInputs.length > 0) {
      doc += '\n    Required inputs:\n';
      requiredInputs.forEach(input => {
        doc += `      - ${input.name} (${input.type}): ${input.description || 'N/A'}\n`;
      });
    }

    // Show optional inputs
    const optionalInputs = block.inputs.filter(i => !i.required);
    if (optionalInputs.length > 0 && detailed) {
      doc += '\n    Optional inputs:\n';
      optionalInputs.forEach(input => {
        doc += `      - ${input.name} (${input.type}): ${input.description || 'N/A'}\n`;
      });
    }

    // Show outputs
    if (block.outputs.length > 0) {
      doc += '\n    Outputs:\n';
      block.outputs.slice(0, 5).forEach(output => {
        doc += `      - {{${output.name}}} (${output.type}): ${output.description || 'N/A'}\n`;
      });
      if (block.outputs.length > 5) {
        doc += `      ... and ${block.outputs.length - 5} more\n`;
      }
    }

    // Show example config
    if (block.exampleConfig) {
      doc += '\n    Example config:\n';
      Object.entries(block.exampleConfig).forEach(([key, value]) => {
        doc += `      ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    // Show common patterns
    if (block.commonPatterns && block.commonPatterns.length > 0) {
      doc += '\n    Common patterns:\n';
      block.commonPatterns.forEach(pattern => {
        doc += `      - ${pattern}\n`;
      });
    }
  } else {
    // Compact format - just show key inputs
    const keyInputs = block.inputs.filter(i => i.required).slice(0, 3);
    if (keyInputs.length > 0) {
      doc += `    Inputs: ${keyInputs.map(i => i.name).join(', ')}\n`;
    }
  }

  doc += '\n';
  return doc;
}

/**
 * Get blocks filtered by category
 */
export function getBlocksByCategory(category: string): BlockDocumentation[] {
  const blocks = generateBlocksDocumentation();
  return blocks.filter(b => b.category === category);
}

/**
 * Get blocks suitable for a specific use case
 */
export function getBlocksForUseCase(useCase: 'telegram_bot' | 'trading' | 'data_processing'): {
  essential: BlockDocumentation[];
  recommended: BlockDocumentation[];
  optional: BlockDocumentation[];
} {
  const blocks = generateBlocksDocumentation();

  const useCaseMapping = {
    telegram_bot: {
      essential: ['telegram_trigger', 'ai_agent'],
      recommended: ['send_telegram', 'llm_analysis', 'get_conversation_state', 'set_conversation_state'],
      optional: ['conditional', 'filter', 'map'],
    },
    trading: {
      essential: ['telegram_trigger', 'authorize_session_key', 'execute_trade_with_session_key'],
      recommended: ['ai_agent', 'jupiter_token_info', 'jupiter_swap_quote', 'pump_fun_data', 'helius_balance', 'llm_analysis'],
      optional: ['conditional', 'send_telegram'],
    },
    data_processing: {
      essential: ['manual_trigger', 'webhook_trigger'],
      recommended: ['llm_analysis', 'filter', 'map', 'conditional'],
      optional: ['send_telegram'],
    },
  };

  const mapping = useCaseMapping[useCase];

  return {
    essential: blocks.filter(b => mapping.essential.includes(b.type)),
    recommended: blocks.filter(b => mapping.recommended.includes(b.type)),
    optional: blocks.filter(b => mapping.optional.includes(b.type)),
  };
}

/**
 * Export for use in AI Assistant
 */
export const BlocksKnowledgeBase = {
  generateBlocksDocumentation,
  generateLLMBlocksPrompt,
  getBlocksByCategory,
  getBlocksForUseCase,
};
