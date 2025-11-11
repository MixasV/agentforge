import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const workflowId = 'e83be4c3-557b-4643-b5cf-bc3ffd0ed552';
  
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  const canvas = JSON.parse(workflow.canvasJson);
  
  // Найти AI Agent блок
  const aiAgentNode = canvas.nodes.find(n => n.data.type === 'ai_agent');
  
  if (aiAgentNode) {
    console.log('OLD prompt:', aiAgentNode.data.config.prompt);
    
    // Исправить reference
    aiAgentNode.data.config.prompt = '{{telegram_trigger.messageText}}';
    
    console.log('NEW prompt:', aiAgentNode.data.config.prompt);
    
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { canvasJson: JSON.stringify(canvas) }
    });
    
    console.log('✅ Fixed workflow reference!');
  }
  
  await prisma.$disconnect();
}

fix().catch(console.error);
