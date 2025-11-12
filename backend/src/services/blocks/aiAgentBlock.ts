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
  description: 'Autonomous AI Agent that can use ANY block as a tool. Like n8n AI Agent - makes intelligent decisions, calls tools, and orchestrates complex workflows.',
  category: 'ai',
  inputs: [
    {
      name: 'userMessage',
      type: 'string',
      required: true,
      description: 'User message/input for the AI agent',
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
      description: 'Telegram chat ID (auto-filled from Telegram Trigger)',
    },
    {
      name: 'botToken',
      type: 'string',
      required: false,
      description: 'Telegram bot token (auto-filled from environment)',
    },
    {
      name: 'enabledTools',
      type: 'string',
      required: false,
      description: 'Comma-separated list of tools: send_telegram,jupiter_quote,pump_fun_data OR use wildcards: data* (all data blocks), action* (all action blocks), all (all blocks)',
    },
    {
      name: 'model',
      type: 'select',
      required: false,
      description: 'AI Model (default: GPT-10)',
      options: [
        { value: 'GPT-10', label: 'GPT-10 (Smart, 20 credits)' },
        { value: 'Claude-7.7', label: 'Claude-7.7 (Balanced, 15 credits)' },
        { value: 'Gemini-5', label: 'Gemini-5 (Fast, 10 credits)' },
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
        userMessage,
        prompt = userMessage, // backward compatibility with old workflows
        systemMessage = 'You are a helpful AI assistant. Use available tools to help the user.',
        chatId,
        botToken,
        enabledTools = 'send_telegram,get_token_info',
        model = 'GPT-10',
        maxIterations = 5,
      } = inputs;

      // VISUAL TOOL CONNECTION: Check if tools are connected via edges
      let toolsList: string[] = [];
      
      if (context?.edges && context?.allNodes) {
        // Find current AI Agent node
        const currentNode = context.allNodes.find(n => n.data.type === 'ai_agent');
        
        if (currentNode) {
          // Get visually connected tools (edges with targetHandle='tool')
          const connectedTools = context.edges
            .filter(edge => edge.target === currentNode.id && edge.targetHandle === 'tool')
            .map(edge => context.allNodes?.find(n => n.id === edge.source))
            .filter(Boolean);
          
          if (connectedTools.length > 0) {
            toolsList = connectedTools.map(n => n!.data.type);
            logger.info(`🔌 AI Agent using ${connectedTools.length} visually connected tools`, { tools: toolsList });
          } else {
            toolsList = String(enabledTools).split(',').map(t => t.trim()).filter(Boolean);
            logger.info('📝 AI Agent using text-based tools (no visual connections)', { tools: toolsList });
          }
        } else {
          toolsList = String(enabledTools).split(',').map(t => t.trim()).filter(Boolean);
        }
      } else {
        toolsList = String(enabledTools).split(',').map(t => t.trim()).filter(Boolean);
      }

      logger.info('AI Agent started', { 
        model, 
        toolsCount: toolsList.length,
        hasPrompt: !!prompt,
        userMessage: String(userMessage || prompt).substring(0, 100),
      });

      // Register available tools
      const tools = registerTools(toolsList, { chatId, botToken }, context);

      if (tools.length === 0) {
        logger.warn('No tools enabled for AI Agent');
      }

      // Get API keys
      const GROQ_API_KEY = process.env.GROQ_API;
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      
      if (!GROQ_API_KEY && !OPENROUTER_API_KEY) {
        throw new Error('Neither GROQ_API nor OPENROUTER_API_KEY configured. Need at least one!');
      }

      // Map user-friendly names to Groq production models (with fallback cascade)
      const modelMapping: Record<string, string[]> = {
        'GPT-10': [
          'llama-3.3-70b-versatile',      // Best quality, tool calling
          'openai/gpt-oss-120b',          // Fallback 1
          'llama-3.1-8b-instant',         // Fallback 2
        ],
        'Claude-7.7': [
          'openai/gpt-oss-120b',          // OpenAI OSS
          'llama-3.3-70b-versatile',      // Fallback 1
          'llama-3.1-8b-instant',         // Fallback 2
        ],
        'Gemini-5': [
          'llama-3.1-8b-instant',         // Fastest
          'openai/gpt-oss-20b',           // Fallback 1
          'llama-3.3-70b-versatile',      // Fallback 2
        ],
      };

      const modelCascade = modelMapping[String(model)] || modelMapping['GPT-10'];
      const actualModel = modelCascade[0]; // Use first model in cascade

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

        // Call LLM with tools (with cascade fallback)
        let response;
        let lastError;
        
        // Try Groq models first
        if (GROQ_API_KEY) {
          for (const modelToTry of modelCascade) {
            try {
              response = await callLLMWithTools(
                modelToTry,
                messages,
                tools,
                GROQ_API_KEY,
                'groq'
              );
              break; // Success!
            } catch (error: any) {
              lastError = error;
              logger.warn(`Groq model ${modelToTry} failed, trying next`, { error: error.message });
              continue;
            }
          }
        }
        
        // If all Groq models failed, try OpenRouter as final fallback
        if (!response && OPENROUTER_API_KEY) {
          logger.info('All Groq models failed, falling back to OpenRouter');
          
          const openRouterModels = [
            'openai/gpt-4o-mini',
            'anthropic/claude-3.5-haiku',
            'meta-llama/llama-3.1-8b-instruct',
          ];
          
          for (const openRouterModel of openRouterModels) {
            try {
              response = await callLLMWithTools(
                openRouterModel,
                messages,
                tools,
                OPENROUTER_API_KEY,
                'openrouter'
              );
              logger.info('OpenRouter fallback successful', { model: openRouterModel });
              break;
            } catch (error: any) {
              lastError = error;
              logger.warn(`OpenRouter model ${openRouterModel} failed`, { error: error.message });
              continue;
            }
          }
        }
        
        if (!response) {
          throw new Error(`All models failed (Groq + OpenRouter): ${lastError?.message}`);
        }

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
              // Emit tool node started event (for visual feedback like n8n)
              if (context.executor) {
                const toolNodeId = context.allNodes?.find(n => n.data.type === toolName)?.id;
                if (toolNodeId) {
                  context.executor.emit('nodeStarted', {
                    executionId: context.executionId,
                    nodeId: toolNodeId,
                    nodeType: toolName,
                    timestamp: new Date().toISOString(),
                  });
                }
              }

              const toolStartTime = Date.now();
              const toolResult = await tool.execute(toolArgs, context);
              
              // Emit tool node completed event
              if (context.executor) {
                const toolNodeId = context.allNodes?.find(n => n.data.type === toolName)?.id;
                if (toolNodeId) {
                  context.executor.emit('nodeCompleted', {
                    executionId: context.executionId,
                    nodeId: toolNodeId,
                    nodeType: toolName,
                    output: toolResult,
                    duration: Date.now() - toolStartTime,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
              
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
              
              // Emit tool node failed event
              if (context.executor) {
                const toolNodeId = context.allNodes?.find(n => n.data.type === toolName)?.id;
                if (toolNodeId) {
                  context.executor.emit('nodeFailed', {
                    executionId: context.executionId,
                    nodeId: toolNodeId,
                    nodeType: toolName,
                    error: error.message,
                    duration: 0,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
              
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

        const finalResponse = response.message.content || '';

        // Auto-send response to Telegram if we have chatId and didn't use send_telegram tool
        const usedSendTelegram = toolsUsed.includes('send_telegram');
        const hasChatId = inputs.chatId || context.$context?.chatId;
        const hasBotToken = inputs.botToken || context.$context?.botToken;

        if (!usedSendTelegram && hasChatId && hasBotToken && finalResponse) {
          logger.info('Auto-sending final response to Telegram', { chatId: hasChatId });
          
          try {
            const sendTelegramTool = tools.find(t => t.name === 'send_telegram');
            if (sendTelegramTool) {
              await sendTelegramTool.execute({
                chatId: hasChatId,
                message: finalResponse,
              }, context);
              logger.info('Auto-sent response to Telegram successfully');
            }
          } catch (error) {
            logger.error('Failed to auto-send response to Telegram', error);
          }
        }

        return {
          response: finalResponse,
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
 * 
 * NEW APPROACH: Universal tool registration
 * - Instead of hardcoded tools, dynamically create tools from any block
 * - Allows AI Agent to use ANY block as a tool (Jupiter, Pump.fun, Helius, etc.)
 * - Automatically maps block inputs to tool parameters
 */
function registerTools(
  toolsList: string[],
  config: { chatId?: any; botToken?: any },
  context: ExecutionContext
): AITool[] {
  const tools: AITool[] = [];

  // Get all available blocks
  const { BLOCKS_REGISTRY } = require('./index');

  // Parse tools list - can be:
  // 1. Specific blocks: "send_telegram,jupiter_quote"
  // 2. Category wildcards: "data*" (all data blocks)
  // 3. "all" (all non-trigger blocks)
  const enableAllDataBlocks = toolsList.includes('data*') || toolsList.includes('all');
  const enableAllActionBlocks = toolsList.includes('action*') || toolsList.includes('all');

  // Register tools from BLOCKS_REGISTRY
  Object.entries(BLOCKS_REGISTRY).forEach(([blockType, blockDef]: [string, any]) => {
    // Skip trigger blocks (they can't be used as tools)
    if (blockDef.category === 'trigger') {
      return;
    }

    // Check if this block should be enabled
    const shouldEnable = 
      toolsList.includes(blockType) || 
      toolsList.includes('all') ||
      (enableAllDataBlocks && blockDef.category === 'data') ||
      (enableAllActionBlocks && blockDef.category === 'action');

    if (!shouldEnable) {
      return;
    }

    // Build tool from block definition
    const tool: AITool = {
      name: blockType,
      description: blockDef.description || `Execute ${blockDef.name} block`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async (params) => {
        // Auto-fill botToken from multiple sources (priority order)
        let resolvedBotToken = 
          params.botToken || 
          config.botToken || 
          context.envVars?.TELEGRAM_BOT_TOKEN;
        
        // If still no token, try to get from Telegram Trigger output
        if (!resolvedBotToken && context.nodeOutputs) {
          const triggerOutput = Object.values(context.nodeOutputs).find((output: any) => output?.botToken);
          if (triggerOutput) {
            resolvedBotToken = (triggerOutput as any).botToken;
          }
        }
        
        // Merge params with config context (chatId, botToken, etc.)
        const inputs = {
          ...params,
          chatId: params.chatId || params.chat_id || config.chatId,
          botToken: resolvedBotToken,
          // ✅ FORCE Markdown for send_telegram from AI Agent
          ...(blockType === 'send_telegram' && { parseMode: params.parseMode || 'Markdown' }),
        };

        // Execute the block
        if (!blockDef.execute) {
          throw new Error(`Block ${blockType} does not have execute function`);
        }

        return await blockDef.execute(inputs, context);
      },
    };

    // Build parameters schema from block inputs
    blockDef.inputs.forEach((input: any) => {
      // Skip inputs that are auto-filled from context
      const autoFilledInputs = ['botToken', 'chatId'];
      if (autoFilledInputs.includes(input.name)) {
        // Make optional since we auto-fill from context
        tool.parameters.properties[input.name] = {
          type: mapTypeToJsonSchema(input.type),
          description: `${input.description || input.name} (auto-filled from context if not provided)`,
        };
        return;
      }

      tool.parameters.properties[input.name] = {
        type: mapTypeToJsonSchema(input.type),
        description: input.description || input.name,
      };

      if (input.required) {
        tool.parameters.required.push(input.name);
      }
    });

    tools.push(tool);
    logger.debug(`Registered AI tool: ${blockType}`, {
      category: blockDef.category,
      creditsCost: blockDef.creditsCost,
    });
  });

  // LEGACY: Hardcoded get_token_info (DexScreener API)
  // This is NOT a block, but a custom tool
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

  logger.info(`AI Agent registered ${tools.length} tools`, {
    tools: tools.map(t => t.name),
  });

  return tools;
}

/**
 * Map block input type to JSON Schema type
 */
function mapTypeToJsonSchema(blockType: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    array: 'array',
    object: 'object',
    select: 'string',
  };
  return typeMap[blockType] || 'string';
}

/**
 * Call LLM with tool support
 */
async function callLLMWithTools(
  model: string,
  messages: AgentMessage[],
  tools: AITool[],
  apiKey: string,
  provider: 'groq' | 'openrouter' = 'groq'
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
    provider,
    model, 
    toolsCount: toolsSpec.length,
    messagesCount: messages.length 
  });

  const apiUrl = provider === 'openrouter' 
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';
    
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  
  // OpenRouter specific headers
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://agentforge.ai';
    headers['X-Title'] = 'AgentForge';
  }

  let response;
  let lastError;
  
  // Retry logic for rate limits (429)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await axios.post(apiUrl, payload, {
        headers,
        timeout: 60000,
      });
      break; // Success!
    } catch (error: any) {
      lastError = error;
      
      // Only retry on 429 (rate limit)
      if (error.response?.status === 429 && attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
        logger.warn(`Rate limited (429), retrying in ${delay}ms`, { model, attempt: attempt + 1 });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry other errors
      throw error;
    }
  }

  if (!response || !response.data || !response.data.choices || !response.data.choices[0]) {
    throw lastError || new Error('Invalid LLM response');
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
