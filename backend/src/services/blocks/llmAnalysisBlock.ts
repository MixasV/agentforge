import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import axios from 'axios';

interface IntentAnalysis {
  action: 'analyze_token' | 'buy_token' | 'sell_token' | 'get_token_info' | 'get_balance' | 'get_price' | 'unknown';
  token_address?: string;
  amount?: number;
  token_symbol?: string;
  confidence: number;
  reasoning: string;
  extracted_data?: Record<string, any>;
}

export const llmAnalysisBlock: BlockDefinition = {
  name: 'LLM Intent Analysis',
  description: 'AI Agent: Understands user intent and extracts structured data',
  category: 'ai',
  inputs: [
    {
      name: 'userMessage',
      type: 'string',
      required: true,
      description: 'User message to analyze',
    },
    {
      name: 'systemPrompt',
      type: 'string',
      required: false,
      description: 'Custom system prompt (optional)',
    },
    {
      name: 'model',
      type: 'select',
      required: false,
      description: 'AI Model to use (default: GPT-10)',
      options: [
        { value: 'GPT-10', label: 'GPT-10 (20 credits)', credits: 20 },
        { value: 'Claude-7.7', label: 'Claude-7.7 (15 credits)', credits: 15 },
        { value: 'Gemini-5', label: 'Gemini-5 (10 credits)', credits: 10 },
      ],
      default: 'GPT-10',
    },
  ],
  outputs: [
    {
      name: 'action',
      type: 'string',
      description: 'Detected action: analyze_token, buy_token, sell_token, get_token_info, get_balance, get_price, unknown',
    },
    {
      name: 'token_address',
      type: 'string',
      description: 'Extracted token address (if any)',
    },
    {
      name: 'token_symbol',
      type: 'string',
      description: 'Extracted token symbol (if any)',
    },
    {
      name: 'amount',
      type: 'number',
      description: 'Extracted amount (if any)',
    },
    {
      name: 'confidence',
      type: 'number',
      description: 'Confidence score (0-1)',
    },
    {
      name: 'reasoning',
      type: 'string',
      description: 'AI reasoning for the decision',
    },
    {
      name: 'raw_response',
      type: 'string',
      description: 'Full LLM response',
    },
    {
      name: 'model_used',
      type: 'string',
      description: 'Actual model that was used (technical name)',
    },
    {
      name: 'model_display_name',
      type: 'string',
      description: 'Display name of selected model (GPT-10, Claude-7.7, etc.)',
    },
    {
      name: 'credits_used',
      type: 'number',
      description: 'Credits consumed by this request',
    },
  ],
  creditsCost: 20, // Maximum cost (GPT-10), actual cost calculated dynamically
  execute: async (inputs) => {
    try {
      const { userMessage, systemPrompt, model = 'GPT-10' } = inputs;

      // Map user-friendly names to actual cascade
      const modelMapping: Record<string, { cascade: string[], credits: number }> = {
        'GPT-10': {
          cascade: [
            'google/gemini-2.0-flash-exp:free',
            'meta-llama/llama-3.2-3b-instruct:free',
            'google/gemini-flash-1.5-8b:free',
            'qwen/qwen-2-7b-instruct:free',
          ],
          credits: 20,
        },
        'Claude-7.7': {
          cascade: [
            'meta-llama/llama-3.2-3b-instruct:free',
            'google/gemini-2.0-flash-exp:free',
            'google/gemini-flash-1.5-8b:free',
          ],
          credits: 15,
        },
        'Gemini-5': {
          cascade: [
            'google/gemini-flash-1.5-8b:free',
            'google/gemini-2.0-flash-exp:free',
            'qwen/qwen-2-7b-instruct:free',
          ],
          credits: 10,
        },
      };

      const selectedModelConfig = modelMapping[String(model)] || modelMapping['GPT-10'];
      const creditsUsed = selectedModelConfig.credits;

      logger.info('LLM Intent Analysis started', {
        modelName: model,
        creditsToUse: creditsUsed,
        cascadeLength: selectedModelConfig.cascade.length,
      });

      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

      if (!OPENROUTER_API_KEY) {
        logger.warn('OPENROUTER_API_KEY not configured, using fallback');
        
        // Fallback: Simple pattern matching
        const lowerMsg = String(userMessage).toLowerCase();
        let action: IntentAnalysis['action'] = 'unknown';
        let confidence = 0.5;
        
        if (lowerMsg.includes('анализ') || lowerMsg.includes('риск') || lowerMsg.includes('analyz')) {
          action = 'analyze_token';
          confidence = 0.7;
        } else if (lowerMsg.includes('купи') || lowerMsg.includes('buy') || lowerMsg.includes('purchase')) {
          action = 'buy_token';
          confidence = 0.7;
        } else if (lowerMsg.includes('прода') || lowerMsg.includes('sell')) {
          action = 'sell_token';
          confidence = 0.7;
        } else if (lowerMsg.includes('инфо') || lowerMsg.includes('info') || lowerMsg.includes('что это')) {
          action = 'get_token_info';
          confidence = 0.7;
        } else if (lowerMsg.includes('балан') || lowerMsg.includes('balance')) {
          action = 'get_balance';
          confidence = 0.7;
        } else if (lowerMsg.includes('цена') || lowerMsg.includes('price') || lowerMsg.includes('стоимость')) {
          action = 'get_price';
          confidence = 0.7;
        }
        
        // Extract token address (44 chars base58)
        const addressMatch = String(userMessage).match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
        const token_address = addressMatch ? addressMatch[0] : undefined;
        
        // Extract amount
        const amountMatch = String(userMessage).match(/(\d+(?:\.\d+)?)\s*(SOL|sol|токен|token)?/i);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;
        
        return {
          action,
          token_address,
          amount,
          confidence,
          reasoning: 'Fallback pattern matching (OPENROUTER_API_KEY not configured)',
          raw_response: 'Pattern matching',
          model_used: 'pattern_matching',
          model_display_name: 'Pattern Matching',
          credits_used: 0, // Free fallback
        };
      }

      // Default system prompt for intent classification
      const defaultSystemPrompt = `You are an AI agent for a Solana trading bot. Your job is to understand user intent and extract structured data.

Possible actions:
- analyze_token: User wants risk analysis, audit, or information about token safety
- buy_token: User wants to buy/purchase a token
- sell_token: User wants to sell a token
- get_token_info: User wants basic information about a token (supply, price, etc.)
- get_balance: User wants to check wallet balance
- get_price: User wants to know token price
- unknown: Cannot determine intent

Extract:
- Token address (Solana address, 32-44 characters base58)
- Token symbol (like SOL, BONK, USDC)
- Amount (if mentioned)

Respond with JSON only:
{
  "action": "one_of_the_actions_above",
  "token_address": "extracted_address_or_null",
  "token_symbol": "extracted_symbol_or_null",
  "amount": extracted_number_or_null,
  "confidence": 0.0_to_1.0,
  "reasoning": "brief_explanation"
}`;

      // Use cascade from selected model config
      const fallbackModels = selectedModelConfig.cascade;

      let lastError: any = null;
      
      // Try each model in cascade
      for (const currentModel of fallbackModels) {
        try {
          logger.info('Attempting LLM call', {
            model: currentModel,
            attempt: fallbackModels.indexOf(currentModel) + 1,
            totalModels: fallbackModels.length,
          });

          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model: currentModel,
              messages: [
                {
                  role: 'system',
                  content: systemPrompt || defaultSystemPrompt,
                },
                {
                  role: 'user',
                  content: userMessage,
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.3,
              max_tokens: 500,
            },
            {
              headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.BASE_URL || 'https://agentforge.ai',
                'X-Title': 'AgentForge',
              },
              timeout: 30000,
            }
          );

          // Success! Parse and return
          const rawResponse = response.data.choices[0].message.content;
          const analysis: IntentAnalysis = JSON.parse(rawResponse);

          logger.info('Intent analysis SUCCESS', {
            model: currentModel,
            action: analysis.action,
            confidence: analysis.confidence,
            hasTokenAddress: !!analysis.token_address,
          });

          return {
            action: analysis.action,
            token_address: analysis.token_address || null,
            token_symbol: analysis.token_symbol || null,
            amount: analysis.amount || null,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            raw_response: rawResponse,
            model_used: currentModel,
            model_display_name: model,
            credits_used: creditsUsed,
          };
        } catch (modelError: any) {
          lastError = modelError;
          const statusCode = modelError.response?.status;
          const errorMessage = modelError.response?.data?.error?.message || modelError.message;

          logger.warn('Model failed, trying next', {
            model: currentModel,
            status: statusCode,
            error: errorMessage,
          });

          // If rate limited (429) or unavailable (503), try next model
          if (statusCode === 429 || statusCode === 503 || statusCode === 404) {
            continue; // Try next model
          }

          // For other errors, try next model but log as error
          logger.error('Unexpected error, trying next model', {
            model: currentModel,
            status: statusCode,
            error: errorMessage,
          });
          continue;
        }
      }

      // All models failed - use pattern matching fallback
      logger.warn('All LLM models failed, using pattern matching fallback', {
        lastError: lastError?.message,
      });

      // Last resort: pattern matching fallback
      const lowerMsg = String(userMessage).toLowerCase();
      let action: IntentAnalysis['action'] = 'unknown';
      let confidence = 0.6;
      
      if (lowerMsg.includes('анализ') || lowerMsg.includes('риск') || lowerMsg.includes('analyz')) {
        action = 'analyze_token';
      } else if (lowerMsg.includes('купи') || lowerMsg.includes('buy') || lowerMsg.includes('purchase')) {
        action = 'buy_token';
      } else if (lowerMsg.includes('прода') || lowerMsg.includes('sell')) {
        action = 'sell_token';
      } else if (lowerMsg.includes('инфо') || lowerMsg.includes('info') || lowerMsg.includes('что это')) {
        action = 'get_token_info';
      } else if (lowerMsg.includes('балан') || lowerMsg.includes('balance')) {
        action = 'get_balance';
      } else if (lowerMsg.includes('цена') || lowerMsg.includes('price') || lowerMsg.includes('стоимость')) {
        action = 'get_price';
      }
      
      const addressMatch = String(userMessage).match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
      const token_address = addressMatch ? addressMatch[0] : null;
      
      const amountMatch = String(userMessage).match(/(\d+(?:\.\d+)?)\s*(SOL|sol|токен|token)?/i);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
      
      return {
        action,
        token_address,
        token_symbol: null,
        amount,
        confidence,
        reasoning: 'Pattern matching fallback (all LLM models unavailable)',
        raw_response: 'Fallback after all models failed',
        model_used: 'pattern_matching_fallback',
        model_display_name: 'Pattern Matching',
        credits_used: 0, // Free fallback
      };
    } catch (error: any) {
      logger.error('LLM analysis block failed catastrophically', {
        error: error.message,
        stack: error.stack,
      });

      // Catastrophic failure - return unknown
      return {
        action: 'unknown',
        token_address: null,
        token_symbol: null,
        amount: null,
        confidence: 0,
        reasoning: `Critical error: ${error.message}`,
        raw_response: 'Error',
        model_used: 'error',
        model_display_name: 'Error',
        credits_used: 0,
      };
    }
  },
};
