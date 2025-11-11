import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixWorkflow() {
  const workflowId = 'e83be4c3-557b-4643-b5cf-bc3ffd0ed552';
  
  const newCanvas = {
    nodes: [
      {
        id: 'telegram_trigger',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          type: 'telegram_trigger',
          label: 'Telegram Trigger',
          category: 'trigger',
          description: 'Triggers workflow on new Telegram message',
          icon: '📱',
          config: {
            botToken: '{{env.TELEGRAM_BOT_TOKEN}}'
          }
        }
      },
      {
        id: 'ai_agent',
        type: 'custom',
        position: { x: 100, y: 250 },
        data: {
          type: 'ai_agent',
          label: 'AI Agent',
          category: 'ai',
          description: 'Universal AI Agent with tool calling',
          icon: '🤖',
          config: {
            systemPrompt: 'You are a Solana token assistant bot.\n\nWhen user sends /start - respond: "Please send me a token symbol (SOL, BONK, etc) or mint address to get information."\n\nWhen user sends a token symbol or address - use jupiter_token_info tool to search and then provide a detailed analysis including:\n- Token name and symbol\n- Current price and market cap  \n- Liquidity and holder count\n- Security audit info (mint authority, freeze authority, top holders %)\n- Organic score and trading activity\n\nBe concise but informative.',
            tools: ['jupiter_token_info'],
            userMessage: '{{telegram_trigger.messageText}}'
          }
        }
      },
      {
        id: 'send_telegram',
        type: 'custom',
        position: { x: 100, y: 450 },
        data: {
          type: 'send_telegram',
          label: 'Send Response',
          category: 'action',
          description: 'Sends message to Telegram chat',
          icon: '💬',
          config: {
            botToken: '{{env.TELEGRAM_BOT_TOKEN}}',
            chatId: '{{telegram_trigger.chatId}}',
            message: '{{ai_agent.response}}'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'telegram_trigger', target: 'ai_agent', type: 'default' },
      { id: 'e2', source: 'ai_agent', target: 'send_telegram', type: 'default' }
    ]
  };
  
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { canvasJson: JSON.stringify(newCanvas) }
  });
  
  console.log('✅ Fixed with styling!');
  await prisma.$disconnect();
}

fixWorkflow().catch(console.error);
