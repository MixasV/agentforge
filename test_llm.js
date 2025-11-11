// Quick test of LLM Intent Analysis Block
const axios = require('axios');
require('dotenv').config();

async function testLLM() {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  
  console.log('🔍 Testing OpenRouter API Key...\n');
  console.log('Key present:', OPENROUTER_API_KEY ? 'YES ✅' : 'NO ❌');
  console.log('Key prefix:', OPENROUTER_API_KEY ? OPENROUTER_API_KEY.substring(0, 15) + '...' : 'N/A');
  console.log();

  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in .env');
    process.exit(1);
  }

  const testMessage = 'Я хочу купить 10 SOL токена EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  console.log('📝 Test message:', testMessage);
  console.log();
  console.log('🚀 Calling OpenRouter API...\n');

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'system',
            content: `You are an AI agent. Analyze user intent and respond with JSON:
{
  "action": "buy_token|sell_token|analyze_token|get_token_info|unknown",
  "token_address": "extracted_address_or_null",
  "amount": number_or_null,
  "confidence": 0.0_to_1.0,
  "reasoning": "explanation"
}`,
          },
          {
            role: 'user',
            content: testMessage,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 300,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://agentforge.ai',
          'X-Title': 'AgentForge Test',
        },
        timeout: 30000,
      }
    );

    console.log('✅ API Call Successful!\n');
    console.log('📊 Response:');
    console.log('─────────────────────────────────────────');
    
    const result = JSON.parse(response.data.choices[0].message.content);
    console.log('Action:', result.action);
    console.log('Token Address:', result.token_address);
    console.log('Amount:', result.amount);
    console.log('Confidence:', result.confidence);
    console.log('Reasoning:', result.reasoning);
    console.log('─────────────────────────────────────────');
    console.log();

    console.log('💰 Usage:');
    console.log('Input tokens:', response.data.usage?.prompt_tokens || 'N/A');
    console.log('Output tokens:', response.data.usage?.completion_tokens || 'N/A');
    console.log('Total tokens:', response.data.usage?.total_tokens || 'N/A');
    console.log();
    
    console.log('🎉 OpenRouter API Key is WORKING!');
    console.log('🤖 LLM Intent Analysis Block is READY!');
    
  } catch (error) {
    console.error('❌ API Call Failed!\n');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error('\n🔑 Invalid API Key! Check your OPENROUTER_API_KEY in .env');
      } else if (error.response.status === 429) {
        console.error('\n⏱️  Rate limit exceeded. Wait a moment and try again.');
      }
    }
    
    process.exit(1);
  }
}

testLLM();
