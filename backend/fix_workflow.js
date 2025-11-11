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
          config: { botToken: '{{env.TELEGRAM_BOT_TOKEN}}' }
        }
      },
      {
        id: 'ai_agent',
        type: 'custom',
        position: { x: 100, y: 250 },
        data: {
          type: 'ai_agent',
          label: 'AI Agent',
          config: {
            systemPrompt: 'You are a Solana token assistant. When user sends /start, respond: "Send me a token symbol (SOL, BONK) or mint address." When user sends a token, use jupiter_token_info tool to search and provide analysis including price, mcap, liquidity, holders, and security audit.',
            tools: ['jupiter_token_info'],
            userMessage: '{{telegram_trigger.messageText}}'
          }
        }
      },
      {
        id: 'send_telegram',
        type: 'custom',
        position: { x: 100, y: 400 },
        data: {
          type: 'send_telegram',
          label: 'Send Response',
          config: {
            botToken: '{{env.TELEGRAM_BOT_TOKEN}}',
            chatId: '{{telegram_trigger.chatId}}',
            message: '{{ai_agent.response}}'
          }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'telegram_trigger', target: 'ai_agent' },
      { id: 'e2', source: 'ai_agent', target: 'send_telegram' }
    ]
  };
  
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { canvasJson: JSON.stringify(newCanvas) }
  });
  
  console.log('✅ Fixed!');
  await prisma.$disconnect();
}

fixWorkflow().catch(console.error);
