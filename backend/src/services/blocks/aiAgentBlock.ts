import { BlockDefinition, ExecutionContext } from '../../types';
import { logger } from '../../utils/logger';
import axios from 'axios';

interface AITool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: Record<string, any>, context: ExecutionContext) => Promise<any>;
}

interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

/**
 * AI Agent Block - Like n8n AI Agent
 * 
 * This block implements a full AI Agent that can:
 * 1. Receive user prompts
 * 2. Use connected tools/blocks to perform actions
 * 3. Make decisions about which tools to use
 * 4. Chain multiple tool calls to complete complex tasks
 * 
 * How it works:
 * - Agent receives user message and system prompt
 * - LLM decides which tools to call (if any)
 * - Agent executes tools and feeds results back to LLM
 * - LLM generates final response
 * 
 * Available Tools (configured via block config):
 * - send_telegram: Send messages to Telegram
 * - get_token_info: Fetch Solana token information
 * - Custom tools can be added by other blocks
 */
export const aiAgentBlock: BlockDefinition = {
  name: 'AI Agent',
  description: 'AI Agent with tool calling capabilities - like n8n AI Agent. Can use connected blocks as tools to perform actions.',
  category: 'ai',
  inputs: [
    {
      name: 'prompt',
      type: 'string',
      required: true,
      description: 'User message/prompt for the AI agent',
    },
    {
      name: 'systemMessage',
      type: 'string',
      required: false,
      description: 'System prompt to guide agent behavior (e.g., "You are a helpful Solana trading assistant")',
    },
    {
      name: 'chatId',
      type: 'string',
      required: false,
      description: 'Telegram chat ID (for send_telegram tool)',
    },
    {
      name: 'botToken',
      type: 'string',
      required: false,
      description: 'Telegram bot token (for send_telegram tool)',
    },
    {
      name: 'enabledTools',
      type: 'string',
      required: false,
      description: 'Comma-separated list of enabled tools: send_telegram,get_token_info',
    },
    {
      name: 'model',
      type: 'select',
      required: false,
      description: 'AI Model (default: gpt-4o-mini)',
      options: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, 15 credits)' },
        { value: 'gpt-4o', label: 'GPT-4o (Smart, 30 credits)' },
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Fast, 10 credits)' },
      ],
    },
    {
      name: 'maxIterations',
      type: 'number',
      required: false,
      description: 'Maximum tool calling iterations (default: 5)',
    },
  ],
  outputs: [
    {
      name: 'response',
      type: 'string',
      description: 'Final agent response',
    },
    {
      name: 'toolsUsed',
      type: 'array',
      description: 'List of tools that were called',
    },
    {
      name: 'conversationHistory',
      type: 'array',
      description: 'Full conversation with tool calls',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether agent completed successfully',
    },
  ],
  creditsCost: 30, // Max cost, actual depends on model
  
  execute: async (inputs, context) => {
    try {
      const {
        prompt,
        systemMessage = 'You are a helpful AI assistant. Use available tools to help the user.',
        chatId,
        botToken,
        enabledTools = 'send_telegram,get_token_info',
        model = 'gpt-4o-mini',
        maxIterations = 5,
      } = inputs;

      logger.info('AI Agent started', { 
        model, 
        enabledTools,
        hasPrompt: !!prompt 
      });

      // Parse enabled tools
      const toolsList = String(enabledTools).split(',').map(t => t.trim()).filter(Boolean);

      // Register available tools
      const tools = registerTools(toolsList, { chatId, botToken }, context);

      if (tools.length === 0) {
        logger.warn('No tools enabled for AI Agent');
      }

      // Get API key
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY not configured in environment variables');
      }

      // Map model names to OpenRouter format
      const modelMapping: Record<string, string> = {
        'gpt-4o-mini': 'openai/gpt-4o-mini',
        'gpt-4o': 'openai/gpt-4o',
        'gemini-2.0-flash-exp': 'google/gemini-2.0-flash-exp:free',
      };

      const actualModel = modelMapping[String(model)] || 'openai/gpt-4o-mini';

      // Initialize conversation
      const messages: AgentMessage[] = [
        {
          role: 'system',
          content: systemMessage as string,
        },
        {
          role: 'user',
          content: prompt as string,
        },
      ];

      const toolsUsed: string[] = [];
      let iterations = 0;

      // Agent loop: LLM → Tools → LLM → ...
      while (iterations < maxIterations) {
        iterations++;
        
        logger.info(`Agent iteration ${iterations}/${maxIterations}`);

        // Call LLM with tools
        const response = await callLLMWithTools(
          actualModel,
          messages,
          tools,
          OPENROUTER_API_KEY
        );

        // Add assistant message to history
        messages.push(response.message);

        // Check if LLM wants to use tools
        if (response.message.tool_calls && response.message.tool_calls.length > 0) {
          logger.info(`Agent wants to use ${response.message.tool_calls.length} tool(s)`);

          // Execute all requested tools
          for (const toolCall of response.message.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

            logger.info(`Executing tool: ${toolName}`, { args: toolArgs });
            toolsUsed.push(toolName);

            // Find and execute tool
            const tool = tools.find(t => t.name === toolName);
            if (!tool) {
              logger.error(`Tool not found: ${toolName}`);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify({ error: `Tool ${toolName} not found` }),
              });
              continue;
            }

            try {
              const toolResult = await tool.execute(toolArgs, context);
              
              // Add tool result to conversation
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify(toolResult),
              });

              logger.info(`Tool ${toolName} executed successfully`);
            } catch (error: any) {
              logger.error(`Tool ${toolName} failed`, error);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify({ error: error.message }),
              });
            }
          }

          // Continue loop to let LLM process tool results
          continue;
        }

        // No more tool calls - agent is done
        logger.info('Agent completed', { 
          iterations, 
          toolsUsed: toolsUsed.length 
        });

        return {
          response: response.message.content || '',
          toolsUsed,
          conversationHistory: messages,
          success: true,
          iterations,
        };
      }

      // Max iterations reached
      logger.warn('Agent reached max iterations', { maxIterations });
      
      const lastMessage = messages[messages.length - 1];
      return {
        response: lastMessage.content || 'Agent reached maximum iterations',
        toolsUsed,
        conversationHistory: messages,
        success: false,
        iterations,
      };

    } catch (error: any) {
      logger.error('AI Agent failed', error);
      throw new Error(`AI Agent failed: ${error.message}`);
    }
  },
};

/**
 * Register available tools for the agent
 */
function registerTools(
  toolsList: string[],
  config: { chatId?: any; botToken?: any },
  context: ExecutionContext
): AITool[] {
  const tools: AITool[] = [];

  // Tool: Send Telegram Message
  if (toolsList.includes('send_telegram')) {
    tools.push({
      name: 'send_telegram',
      description: 'Send a message to Telegram chat. Use this when you need to respond to the user or send any information to Telegram.',
      parameters: {
        type: 'object',
        properties: {
          chat_id: {
            type: 'string',
            description: 'Telegram chat ID to send message to',
          },
          message: {
            type: 'string',
            description: 'Message text to send',
          },
        },
        required: ['message'],
      },
      execute: async (params) => {
        const { sendTelegramBlock } = await import('./sendTelegramBlock');
        
        // Use chat_id from params or config
        const chatId = params.chat_id || config.chatId;
        const botToken = config.botToken || context.envVars?.TELEGRAM_BOT_TOKEN;

        if (!chatId) {
          throw new Error('chat_id is required for send_telegram tool');
        }

        if (!botToken) {
          throw new Error('botToken is required for send_telegram tool');
        }

        return await sendTelegramBlock.execute!({
          botToken,
          chatId,
          message: params.message,
          parseMode: 'Markdown',
        }, context);
      },
    });
  }

  // Tool: Get Solana Token Info
  if (toolsList.includes('get_token_info')) {
    tools.push({
      name: 'get_token_info',
      description: 'Fetch information about a Solana token by its address. Returns price, market cap, liquidity, and other data from DexScreener.',
      parameters: {
        type: 'object',
        properties: {
          token_address: {
            type: 'string',
            description: 'Solana token address (contract address)',
          },
        },
        required: ['token_address'],
      },
      execute: async (params) => {
        const { token_address } = params;
        
        // Call DexScreener API
        const response = await axios.get(
          `https://api.dexscreener.com/latest/dex/tokens/${token_address}`,
          { timeout: 10000 }
        );

        if (!response.data || !response.data.pairs || response.data.pairs.length === 0) {
          return {
            error: 'Token not found or no trading pairs available',
            token_address,
          };
        }

        // Get main pair (usually the one with highest liquidity)
        const mainPair = response.data.pairs[0];

        return {
          token_address,
          name: mainPair.baseToken.name,
          symbol: mainPair.baseToken.symbol,
          price_usd: mainPair.priceUsd,
          price_change_24h: mainPair.priceChange?.h24,
          volume_24h: mainPair.volume?.h24,
          liquidity_usd: mainPair.liquidity?.usd,
          market_cap: mainPair.fdv,
          dex: mainPair.dexId,
          pair_address: mainPair.pairAddress,
        };
      },
    });
  }

  return tools;
}

/**
 * Call LLM with tool support
 */
async function callLLMWithTools(
  model: string,
  messages: AgentMessage[],
  tools: AITool[],
  apiKey: string
): Promise<{ message: AgentMessage }> {
  
  // Prepare tools in OpenAI format
  const toolsSpec = tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  const payload: any = {
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content || undefined,
      tool_calls: m.tool_calls || undefined,
      tool_call_id: m.tool_call_id || undefined,
      name: m.name || undefined,
    })),
  };

  // Add tools if available
  if (toolsSpec.length > 0) {
    payload.tools = toolsSpec;
    payload.tool_choice = 'auto';
  }

  logger.debug('Calling LLM', { 
    model, 
    toolsCount: toolsSpec.length,
    messagesCount: messages.length 
  });

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    payload,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.BASE_URL || 'http://localhost:3001',
        'X-Title': 'AgentForge AI Agent',
      },
      timeout: 60000,
    }
  );

  if (!response.data || !response.data.choices || !response.data.choices[0]) {
    throw new Error('Invalid LLM response');
  }

  const choice = response.data.choices[0];
  
  return {
    message: {
      role: 'assistant',
      content: choice.message.content || '',
      tool_calls: choice.message.tool_calls || undefined,
    },
  };
}
