import { Router } from 'express';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

// Groq API configuration with model cascade
// Groq provides fast, stable inference with no provider rate limits
const GROQ_API_KEY = process.env.GROQ_API;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Model cascade: try models in order until one succeeds
// Groq models: 280-560 tokens/sec, stable, no provider 429 errors
const MODEL_CASCADE = [
  'llama-3.3-70b-versatile',      // 70B, 280 t/s, best quality
  'openai/gpt-oss-120b',          // 120B, 470 t/s, reasoning
  'llama-3.1-8b-instant',         // 8B, 560 t/s, fastest backup
];

// Trading keywords detection
const TRADE_KEYWORDS = {
  en: ['buy', 'sell', 'trade', 'swap', 'purchase', 'execute order', 'place order', 'market order'],
  ru: ['купить', 'продать', 'торговать', 'обменять', 'свапнуть', 'сделка', 'ордер', 'купля'],
};

// Entity extraction
function extractEntities(message: string) {
  return {
    botTokens: message.match(/\d+:[A-Za-z0-9_-]{35}/g) || [],
    walletAddresses: message.match(/[A-HJ-NP-Za-km-z1-9]{32,44}/g) || [],
    mentions: {
      SOL: /\bSOL\b|solana/i.test(message),
      USDC: /\bUSDC\b/i.test(message),
      BONK: /\bBONK\b/i.test(message),
      buy: TRADE_KEYWORDS.en.some(kw => message.toLowerCase().includes(kw)) || 
           TRADE_KEYWORDS.ru.some(kw => message.toLowerCase().includes(kw)),
      price: /price|цена|стоимость/i.test(message),
      telegram: /telegram|бот|bot/i.test(message),
    }
  };
}

// Detect if request requires trading
function requiresTrading(message: string): boolean {
  const allKeywords = [...TRADE_KEYWORDS.en, ...TRADE_KEYWORDS.ru];
  return allKeywords.some(kw => message.toLowerCase().includes(kw));
}

import { BlocksKnowledgeBase } from '../services/blocksKnowledgeBase';

// Generate trading bot prompt
function getTradingBotPrompt() {
  return `You are a Solana trading assistant bot.

User will send trading commands in natural language.
Extract structured data from their messages.

Supported commands:
1. "Buy [token] for [amount] [currency]"
   Example: "Buy SOL for 100 USDC"
   Extract: {action: "buy", token: "SOL", amount: 100, currency: "USDC"}

2. "Sell [amount] [token]"
   Example: "Sell 5 SOL"
   Extract: {action: "sell", token: "SOL", amount: 5}

3. "Price [token]"
   Example: "What's the price of SOL?"
   Extract: {action: "price", token: "SOL"}

4. "Buy [token] when price reaches [price]"
   Example: "Buy SOL when price drops to $150"
   Extract: {action: "buy_limit", token: "SOL", targetPrice: 150}

Token addresses (use these):
- SOL: So11111111111111111111111111111111111112
- USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
- BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263

Output format:
{
  "action": "buy" | "sell" | "price" | "buy_limit" | "sell_limit",
  "tokenAddress": "base58_address",
  "amount": number,
  "targetPrice": number (optional),
  "confidence": 0-1
}

If unclear, ask for clarification.
NEVER execute trades without Session Key authorization!`;
}

// POST /api/workflows/ai-assist
router.post('/ai-assist', async (req, res): Promise<any> => {
  try {
    const { message, currentWorkflow, conversationHistory } = req.body;
    const userId = (req as any).user?.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    logger.info('AI Assist request', { userId, message: message.substring(0, 100) });

    // Extract entities from message
    const entities = extractEntities(message);
    const needsTrading = requiresTrading(message);

    // Determine use case
    let useCase: 'telegram_bot' | 'trading' | 'data_processing' | 'general' = 'general';
    if (entities.mentions.telegram || /telegram|бот|bot/i.test(message)) {
      useCase = 'telegram_bot';
    }
    if (needsTrading) {
      useCase = 'trading';
    }

    // Generate blocks documentation using Knowledge Base
    const blocksDoc = BlocksKnowledgeBase.generateLLMBlocksPrompt({
      useCase,
      emphasizeBlocks: useCase === 'telegram_bot' ? ['telegram_trigger', 'ai_agent'] : undefined,
    });

    // Build system prompt
    const systemPrompt = `You are AgentForge AI Assistant. Help users build Solana workflows.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 AVAILABLE BLOCKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${blocksDoc}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current workflow state:
${currentWorkflow ? JSON.stringify(currentWorkflow, null, 2) : 'Empty canvas'}

Extracted entities from user message:
- Bot Tokens: ${entities.botTokens.length > 0 ? entities.botTokens[0] : 'none'}
- Wallet Addresses: ${entities.walletAddresses.join(', ') || 'none'}
- Mentions: ${Object.entries(entities.mentions).filter(([, v]) => v).map(([k]) => k).join(', ')}
- Trading required: ${needsTrading ? 'YES - USE SESSION KEYS!' : 'no'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. **INTERACTIVE BOTS**: AI Agent with Visual Tool Connections (like n8n sub-nodes)
   
   ❌ WRONG - Linear flow (tools execute automatically):
   [Telegram] → [AI Agent] → [Jupiter Token Info] → [Send Telegram]
   
   ✅ RIGHT - Tools as sub-nodes (AI Agent calls them internally):
   [Telegram Trigger] ──→ [AI Agent]
                               ↑ tool edge
                          [Jupiter Token Info]
                               ↑ tool edge
                          [Send Telegram]
   
   🔘 TELEGRAM BUTTONS & CALLBACKS:
   - For YES/NO questions or confirmations: use send_telegram_inline_keyboard (NOT send_telegram!)
   - ALWAYS add handle_callback_query when using inline keyboards
   - Example buttons: [{"text": "Buy", "callback_data": "buy_confirm"}]
   - handle_callback_query processes button clicks and extracts callback_data
   
   🔑 CRITICAL IMPLEMENTATION RULES:
   
   A. EDGES STRUCTURE (example):
      Main flow edge: { source: "telegram_trigger", target: "ai_agent" }
      Tool edges: { source: "jupiter_token_info", target: "ai_agent", targetHandle: "tool" }
                  { source: "send_telegram", target: "ai_agent", targetHandle: "tool" }
   
   B. WHAT HAPPENS:
      - Topological sort EXCLUDES tool edges (targetHandle='tool')
      - Main flow: Telegram Trigger → AI Agent (that's it!)
      - Tool nodes (Jupiter, Send Telegram) are NOT executed automatically
      - AI Agent discovers tools via edges and calls them ONLY when needed
   
   C. AI AGENT CONFIG:
      - userMessage: "{{telegram_trigger.messageText}}"
      - enabledTools: "" (leave empty - tools discovered via edges)
      - systemMessage: guide the agent's behavior
   
   D. TOOL BLOCKS CONFIG:
      - DO NOT add config like query: "{{ai_agent.something}}"
      - Tools receive params from AI Agent dynamically
      - Just place them on canvas with tool edge to AI Agent
   
   E. TOOL SELECTION GUIDE:
      - Simple text messages → send_telegram
      - Questions with buttons → send_telegram_inline_keyboard + handle_callback_query
      - User confirmation needed → ALWAYS use inline keyboard (buttons)
      - Trading/buying → authorize_session_key + execute_trade_with_session_key
      - Token info → jupiter_token_info (NOT old blocks)
   
   F. WHY THIS WORKS (like n8n):
      - Tool edges excluded from main execution flow
      - AI Agent calls tools internally via LLM tool calling
      - Same architecture as n8n sub-nodes!
   
   G. COMMON PATTERNS:
      - Token analysis: jupiter_token_info + send_telegram
      - Token analysis WITH purchase: jupiter_token_info + send_telegram_inline_keyboard + handle_callback_query + authorize_session_key + execute_trade_with_session_key
      - Simple Q&A: just send_telegram
      - Interactive Q&A: send_telegram_inline_keyboard + handle_callback_query
   
   H. SESSION KEY TRADING FLOW (CRITICAL FOR TRADING BOTS):
      When building trading bots, system message MUST enforce this exact sequence:
      
      STEP 1: Get quote
        - Call jupiter_swap_quote(inputMint, outputMint, amount)
        - inputMint/outputMint: FULL 44-char addresses (So11111... NOT "SOL")
        - amount: RAW units with decimals (100000 = 0.0001 SOL)
      
      STEP 2: Ask confirmation with buttons
        - Call send_telegram_inline_keyboard
        - buttons format: "[[{\\"text\\":\\"Yes\\",\\"callback_data\\":\\"confirm\\"},{\\"text\\":\\"No\\",\\"callback_data\\":\\"cancel\\"}]]"
        - IMPORTANT: Double quotes with escaping, NOT single quotes!
      
      STEP 3: When user clicks button (callback_data = "confirm"):
        a) FIRST: Call authorize_session_key(userId, chatId)
        b) Check response.isAuthorized:
           - If FALSE and response.authUrl exists: Send authUrl to user, STOP
           - If TRUE: Continue to step c
        c) Call execute_trade_with_session_key(userId, fromToken, toToken, amount)
        d) Send result message
      
      NEVER SKIP STEP 3a! Always authorize_session_key before execute_trade!
   
   I. ERROR HANDLING PATTERNS FOR AI AGENT:
      System message should include error recovery:
      
      "If tool returns error:
       - address validation errors → ask user to verify address format
       - 'No active session' → means need to call authorize_session_key first
       - 'Token not found' → ask user to check symbol/address
       - Rate limit/API errors → suggest retry later
       - ALWAYS send error explanation via send_telegram (never leave user hanging)"
   
   J. MENU-BASED TRADING BOTS (BEST PRACTICE!)
      
      CRITICAL: AI Agent is TOO SLOW for trading (5-15s per trade, rate limits).
      
      RECOMMENDED ARCHITECTURE - Main Menu Approach:
      
      Step 1: Bot sends main menu when user starts
        send_telegram_inline_keyboard with buttons:
        - "Trade" (callback_data: "mode_trade")
        - "Info" (callback_data: "mode_info")
      
      Step 2: Router splits based on callback_data
        - mode_trade -> FAST LINEAR PATH (no AI!)
        - mode_info -> AI AGENT PATH
      
      TRADE PATH (2-3 seconds):
        1. Ask for trade details via message
        2. Parse with regex (no LLM)
        3. jupiter_swap_quote
        4. Confirm button
        5. authorize_session_key
        6. execute_trade_with_session_key
        7. Show menu again
      
      INFO PATH (5-10 seconds):
        1. AI Agent with tools: jupiter_token_info, send_telegram
        2. Analyze and respond
        3. Show menu again
      
      Benefits:
      - User explicitly chooses mode (clear UX)
      - No complex intent classification
      - Trades execute instantly
      - AI available when time allows
      
      When user asks "Create Solana trading bot":
        Generate workflow with main menu architecture!
   
   AI Agent system message should guide ANALYSIS:
   
   Example system message for token analysis bot:
   "You are an expert Solana token analyst bot with robust error handling.

**WORKFLOW RULES:**

1. **ALWAYS RESPOND TO USER** - Never leave user without response!
   - Success → Send formatted analysis via send_telegram
   - Error → Send helpful error message via send_telegram
   - Invalid input → Ask for clarification via send_telegram
   - Tool failure → Explain what went wrong via send_telegram

2. **TOKEN ANALYSIS FLOW:**
   When user provides token address or symbol:
   
   a) Call jupiter_token_info tool
   b) Handle tool response:
      - ✅ Success: Analyze data and send formatted report
      - ❌ Error "No token found": 
         * Check if address is incomplete (too short/long)
         * Ask user to verify address and try again
         * Example: "Token not found. Please check address: it should be 44 characters (yours is 43). Try copying again?"
      - ❌ API error: Explain Jupiter API is unavailable, try later
   
3. **DATA ANALYSIS** (when tool succeeds):
   Analyze critically:
   - Price & Market Cap: Is it realistic?
   - Liquidity: >$50k is good, <$10k is concerning
   - Holders: More = better distribution
   - Top holder %: >20% is whale risk
   - Security: mint/freeze authority MUST be disabled
   - Organic score: >70 good, 50-70 decent, <50 suspicious
   
4. **RESPONSE FORMAT** (Markdown):
   📊 **Token Name (Symbol)**
   
   💰 **Price:** $X.XXXX
   📈 **Market Cap:** $XXX.XXK
   💧 **Liquidity:** $XXX.XXK
   👥 **Holders:** X,XXX
   🐋 **Top Holder:** XX.X%
   🔒 **Security:** Mint ✅/❌ | Freeze ✅/❌
   📊 **Organic Score:** XX/100
   
   **Verdict:** ✅ Safe / ⚠️ Risky / ❌ Avoid
   Reasoning: [Why this verdict]
   
5. **ERROR HANDLING EXAMPLES:**
   - Incomplete address: "❌ Address too short (43 chars, need 44). Please copy full address."
   - Invalid symbol: "❌ Token 'XYZ' not found. Try full mint address instead."
   - Empty message: "👋 Send me a Solana token address to analyze!"
   - Tool error: "⚠️ Jupiter API error. Please try again in a moment."

6. **CRITICAL**: Use send_telegram for EVERY response - success or error!"
   
   H. RESPONSE HANDLING RULES:
      ⚠️ CRITICAL: AI Agent responses must be sent back to user!
      
      - If AI Agent has send_telegram as tool → IT MUST CALL IT for every response
      - If AI Agent gets error from tool → IT MUST SEND ERROR MESSAGE via send_telegram
      - If user asks invalid question → AI AGENT MUST REPLY via send_telegram
      - System has auto-send fallback BUT agent should call send_telegram explicitly
      
      BAD FLOW: User message → AI Agent analyzes → Returns response (user sees nothing)
      GOOD FLOW: User message → AI Agent analyzes → Calls send_telegram → User gets message
   
   I. ERROR HANDLING PATTERNS FOR AI AGENT:
      🛡️ Make AI Agent system message robust with error handling!
      
      **Common errors and how to handle:**
      
      1. **Tool returns error object**: {"error": "No token found"}
         → Agent must parse error message and send helpful response
         → Example: Check address length, suggest corrections
      
      2. **Empty/Invalid user input**:
         → Don't call tools with empty data
         → Send guidance message: "Please provide [what you need]"
      
      3. **API/Network failures**:
         → Explain service is temporarily unavailable
         → Suggest trying again later
      
      4. **Session Key not authorized** (for trading):
         → Detect error from authorize_session_key
         → Send authorization URL to user
         → Explain: "Click link to authorize trading (secure session key)"
      
      5. **Insufficient funds/limits**:
         → Parse error from execute_trade_with_session_key
         → Explain clearly: amount exceeds limit / insufficient balance
      
      **Template for robust system message:**
      "You are [bot purpose].
      
      When [trigger happens]:
      1. Try to call [tool]
      2. If success: [action]
      3. If error: Parse error message and send helpful response via send_telegram
      4. Always respond - never leave user hanging!
      
      Error responses should:
      - Use emoji (❌ ⚠️ ✅)
      - Be specific about what went wrong
      - Suggest how to fix it
      - Always call send_telegram to deliver the message"
   
2. When trading is involved, ALWAYS use Session Keys blocks:
   - authorize_session_key
   - execute_trade_with_session_key
3. Auto-fill configs when possible (bot tokens, known addresses, etc.)
4. For trading bots, generate comprehensive LLM Intent Analysis prompt
5. Use {{block_id.output}} syntax for dynamic references
6. Return valid JSON with nodes and edges

${needsTrading ? `
⚠️ TRADING DETECTED!
You MUST include:
1. Telegram Trigger (with auto-filled botToken if provided)
2. LLM Intent Analysis with trading prompt (use this):
${getTradingBotPrompt()}
3. Router block (based on LLM action)
4. Authorize Session Key block (permissions: TRADE_ONLY, maxAmount: ask user or default 1000, expiresIn: 30d)
5. Execute Trade with Session Key block (uses LLM outputs)
6. Send Telegram response

Explain to user:
- What commands bot will understand
- Session Key security benefits
- Setup steps: 
  * Create bot via @BotFather in Telegram (https://t.me/BotFather)
  * Get bot token from BotFather
  * Add token to Variables tab in workflow
` : ''}

User request: "${message}"

Generate workflow JSON:
{
  "message": "Natural language explanation",
  "nodes": [
    {
      "id": "unique-id",
      "type": "block_type",
      "position": {"x": number, "y": number},
      "data": {
        "type": "block_type",
        "label": "Block Name",
        "category": "trigger|action|ai|logic|data",
        "config": {
          // Auto-filled where possible!
          "botToken": "${entities.botTokens[0] || '{{env.TELEGRAM_BOT_TOKEN}}'}",
          // Use dynamic references: "{{other_block.output}}"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id"
    }
  ],
  "explanation": "Step by step what workflow does",
  "securityNotes": ["Note 1", "Note 2"] (if trading),
  "commandExamples": ["Example 1"] (if bot with LLM),
  "nextSteps": ["Step 1", "Step 2"]
}`;

    // Call Groq API with cascade fallback
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'AI service not configured. Please set GROQ_API in .env file.',
      });
    }

    let llmResponse;
    let modelUsed = '';
    let lastError;

    // Try models in cascade until one succeeds
    for (const model of MODEL_CASCADE) {
      try {
        logger.info(`Trying Groq model: ${model}`);
        
        llmResponse = await axios.post(
          GROQ_API_URL,
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...(conversationHistory || []),
              { role: 'user', content: message },
            ],
            temperature: 0.7,
            max_tokens: 4000,
            // Note: Groq has automatic prompt caching, no parameter needed
          },
          {
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        modelUsed = model;
        logger.info(`Groq model succeeded: ${model}`);
        break; // Success! Exit loop
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.response?.data?.error?.message || error.message;
        logger.warn(`Groq model ${model} failed: ${errorMsg}`);
        // Continue to next model
      }
    }

    // FALLBACK: Try OpenRouter FREE models if Groq failed
    if (!llmResponse) {
      const OR_KEY = process.env.OPEN_ROUTER_API || process.env.OPENROUTER_API_KEY;
      if (OR_KEY) {
        const freeModels = ['meta-llama/llama-3.2-3b-instruct:free', 'google/gemini-flash-1.5-8b:free'];
        for (const m of freeModels) {
          try {
            logger.info(`OpenRouter FREE: ${m}`);
            llmResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', { model: m, messages: [{ role: 'system', content: systemPrompt }, ...(conversationHistory || []), { role: 'user', content: message }], temperature: 0.7, max_tokens: 4000 }, { headers: { 'Authorization': `Bearer ${OR_KEY}`, 'HTTP-Referer': 'https://agent.mixas.pro' }, timeout: 30000 });
            modelUsed = m; logger.info(`✅ OpenRouter: ${m}`); break;
          } catch (e: any) { lastError = e; logger.warn(`OpenRouter ${m} fail`); }
        }
      }
    }
    
    if (!llmResponse) {
      logger.error('All AI providers failed', lastError);
      return res.status(500).json({ success: false, error: 'All AI models unavailable' });
    }

    const aiResponse = llmResponse.data.choices[0].message.content;

    // Parse JSON from response
    let workflowData;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
                       aiResponse.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        // Remove JavaScript comments from JSON (AI likes to add them)
        let jsonStr = jsonMatch[1];
        jsonStr = jsonStr.replace(/\/\/[^\n]*/g, ''); // Remove // comments
        jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ comments
        
        workflowData = JSON.parse(jsonStr);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      logger.error('Failed to parse AI response', { aiResponse, parseError });
      return res.status(500).json({
        success: false,
        error: 'AI generated invalid response. Please try rephrasing your request.',
        rawResponse: aiResponse,
      });
    }

    // Validate workflow structure
    if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
      logger.error('Invalid workflow: missing nodes array', { workflowData });
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow structure: missing nodes array',
      });
    }

    if (!workflowData.edges || !Array.isArray(workflowData.edges)) {
      logger.error('Invalid workflow: missing edges array', { workflowData });
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow structure: missing edges array',
      });
    }

    // Validate each node has required fields
    for (const node of workflowData.nodes) {
      if (!node.id || !node.type || !node.data || !node.position) {
        logger.error('Invalid node structure', { node });
        return res.status(400).json({
          success: false,
          error: `Invalid node structure: missing required fields`,
        });
      }
    }

    // Validate each edge has required fields
    for (const edge of workflowData.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        logger.error('Invalid edge structure', { edge });
        return res.status(400).json({
          success: false,
          error: `Invalid edge structure: missing required fields`,
        });
      }
    }

    // Auto-layout nodes if positions not specified
    workflowData.nodes = workflowData.nodes.map((node: any, index: number) => ({
      ...node,
      position: node.position || {
        x: 100 + (index % 3) * 250,
        y: 100 + Math.floor(index / 3) * 150,
      },
    }));

    // Return response
    res.json({
      success: true,
      data: {
        message: workflowData.message || 'Workflow generated successfully',
        workflow: {
          nodes: workflowData.nodes,
          edges: workflowData.edges || [],
        },
        explanation: workflowData.explanation,
        securityNotes: workflowData.securityNotes,
        commandExamples: workflowData.commandExamples,
        nextSteps: workflowData.nextSteps,
        entities,
        needsTrading,
        modelUsed, // Include which model from cascade was used
      },
    });

  } catch (error: any) {
    logger.error('AI Assist failed', error);
    
    let errorMessage = 'Failed to generate workflow';
    if (error.response?.status === 429) {
      errorMessage = 'AI service rate limited. Please try again in a moment.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout. Please try a simpler request.';
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
