# AgentForge User Guide

Welcome to AgentForge! This guide will help you create your first automated workflow.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Workflow](#creating-your-first-workflow)
3. [Using AI Assistant](#using-ai-assistant)
4. [Understanding Blocks](#understanding-blocks)
5. [Environment Variables](#environment-variables)
6. [AI Agent Block](#ai-agent-block)
7. [Workflow Activation & Triggers](#workflow-activation--triggers)
8. [Managing Credits](#managing-credits)
9. [Deploying to Telegram](#deploying-to-telegram)
10. [Best Practices](#best-practices)

---

## Getting Started

### 1. Connect Your Wallet

1. Visit AgentForge at http://localhost:3000
2. Click **"Connect with Phantom"**
3. Approve the connection in Phantom wallet
4. Sign the login message

You'll receive **1000 free credits** on first login!

### 2. Dashboard Overview

After logging in, you'll see:
- **Credits Balance** - Your available credits
- **Today Usage** - Credits used today
- **Active Workflows** - Number of running workflows
- **Quick Actions** - Shortcuts to common tasks

---

## Creating Your First Workflow

### Step 1: Create a New Workflow

1. Click **"Workflows"** in sidebar
2. Click **"New Workflow"**
3. Enter name: `"My First Bot"`
4. Add description (optional)
5. Click **"Create"**

### Step 2: Add Blocks to Canvas

You'll see three panels:
- **Left:** Available blocks
- **Center:** Canvas (workspace)
- **Right:** Inspector (configuration)

**To add a block:**
1. Find "Jupiter Swap Quote" in left panel
2. Drag it onto the canvas
3. Or click it to add automatically

### Step 3: Configure the Block

1. Click the block on canvas
2. Right panel opens with configuration
3. Fill in the fields:
   - **Input Mint:** `So11111111111111111111111111111111111111112` (SOL)
   - **Output Mint:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC)
   - **Amount:** `1000000` (0.001 SOL in lamports)

### Step 4: Add More Blocks

1. Add "Pump.fun Token Data" block
2. Add "Filter" block to filter by market cap
3. Add "Send Telegram Message" block for output

### Step 5: Connect Blocks

1. Click on the **right edge** of first block
2. Drag to **left edge** of second block
3. A line (edge) will connect them
4. Repeat to connect all blocks in order

### Step 6: Save Workflow

Press **Ctrl+S** or click **"Save"** button at top

### Step 7: Run Workflow

Press **Ctrl+Enter** or click **"Run"** button

Watch the execution log at bottom:
- 🟢 Green = Success
- 🔴 Red = Failed
- 🔵 Blue = Running

---

## Using AI Assistant

AgentForge has a built-in AI Assistant that can **generate workflows from text descriptions**!

### Step 1: Open AI Assistant

1. Open any workflow editor
2. Click the **"AI Assistant"** button (✨ sparkles icon) in top-right
3. Panel slides in from the right

### Step 2: Describe Your Workflow

Type what you want to build, for example:

```
Create a Telegram bot that:
1. Receives a token address
2. Gets the token price from Jupiter
3. Sends the price back to the user
```

### Step 3: Review Generated Workflow

The AI will:
- Generate nodes and connections
- Show explanation of how it works
- Provide security notes
- Suggest next steps

### Step 4: Apply or Reject

- Click **"Apply to Canvas"** to use the workflow
- Click **"Reject"** to try again
- Previous versions saved in history

### Tips for Better Results

✅ **Good prompts:**
- "Create a bot that sends SOL price every hour"
- "Build a workflow that filters tokens by market cap > 1M and sends to Telegram"
- "Make a trading bot that swaps SOL to USDC when price drops"

❌ **Avoid:**
- Too vague: "Make a bot"
- Missing details: "Send message" (where? when?)

---

## Understanding Blocks

### Trigger Blocks (Purple 🟣)

Start workflows automatically:

**Telegram Trigger**
- Triggers when bot receives message
- Cost: 0 credits
- Outputs: messageText, chatId, userId, botToken
- Must activate workflow to use

**Webhook Trigger**
- Triggers on HTTP POST request
- Cost: 0 credits
- Outputs: body, query, headers, webhookUrl
- Get unique URL when activated

**Schedule Trigger**
- Triggers on cron schedule
- Cost: 0 credits
- Example: `0 * * * *` (every hour)
- Configure in block settings

**Manual Trigger**
- Triggers when you click "Run"
- Cost: 0 credits
- Good for testing workflows

---

### Data Blocks (Blue 🔵)

Fetch data from external APIs:

**Jupiter Quote Block**
- Get token swap quotes
- Cost: 1 credit
- Inputs: inputMint, outputMint, amount
- Output: quote data

**Pump.fun Data Block**
- Get new token data
- Cost: 2 credits
- Inputs: minMarketCap, maxMarketCap, limit
- Output: array of tokens

**Helius Balance Block**
- Check wallet balances
- Cost: 1 credit
- Input: walletAddress
- Output: balanceSol, tokenBalances

**Solana Account Info Block**
- Get account information
- Cost: 1 credit
- Input: accountAddress
- Output: account data

### AI Blocks (Cyan 🔷)

**AI Agent Block**
- Autonomous agent that can use other blocks as tools
- Cost: 30 credits (max, actual depends on usage)
- Can make decisions and chain multiple actions
- See [AI Agent Block](#ai-agent-block) section below

### Logic Blocks (Yellow 🟡)

Process and transform data:

**Filter Block**
- Filter array items by condition
- Cost: 0 credits (free)
- Example: Filter tokens with marketCap > 1M

**Map Block**
- Transform array items
- Cost: 0 credits (free)
- Example: Extract only token names

**Conditional Block**
- If/else logic routing
- Cost: 0 credits (free)
- Choose path based on condition

### Action Blocks (Red 🔴)

Execute actions:

**Send Telegram Message**
- Send text message to Telegram
- Cost: 0 credits
- Inputs: chatId, text, botToken
- Use with Telegram Trigger

**Send Telegram Inline Keyboard**
- Send message with buttons
- Cost: 0 credits
- Inputs: chatId, text, keyboard (JSON)

**Solana Swap**
- Execute token swap on Solana
- Cost: 5 credits
- Inputs: routePlan, slippageBps
- Returns transaction signature

---

## Environment Variables

Store sensitive data like bot tokens and API keys securely.

### Creating Variables

1. Open workflow editor
2. Click **"Variables"** tab (below canvas)
3. Click **"+ Add Variable"**
4. Fill in:
   - **Key:** `TELEGRAM_BOT_TOKEN`
   - **Value:** Your actual bot token
   - **Description:** "Bot token from @BotFather"
   - **Is Secret:** ✅ (masks value in UI)
5. Click **"Save"**

### Using Variables in Blocks

Instead of pasting token in each block:

❌ **Don't do this:**
```
botToken: "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
```

✅ **Do this:**
```
botToken: {{env.TELEGRAM_BOT_TOKEN}}
```

### Apply to All Blocks

1. Enter value in Variables panel
2. Click **"Apply to All Blocks"**
3. All blocks using that variable will be updated
4. Click **"Save"** workflow to persist

### Lock Variables

Prevent accidental changes:

1. Save variable first (must have ID)
2. Click **🔓 Lock** button
3. Variable becomes 🔒 Locked
4. Can't be changed until unlocked

**Use locked variables for:**
- Production bot tokens
- API keys
- Critical configuration

---

## AI Agent Block

The AI Agent is an **autonomous block** that can use other blocks as tools, like n8n AI Agent.

### How It Works

1. You give the AI Agent a task (userMessage)
2. AI decides which tools/blocks to use
3. AI executes tools in sequence
4. AI generates final response

### Visual Tool Connections

Connect blocks to AI Agent to make them available as tools:

1. Add AI Agent block to canvas
2. Add other blocks (e.g., "Send Telegram", "Jupiter Quote")
3. Connect blocks to AI Agent's **tool input** (left side)
4. AI can now use those blocks!

### Configuration

**Inputs:**
- **userMessage:** Task description (e.g., "Get SOL price and send to user")
- **systemMessage:** Guide AI behavior (e.g., "You are a trading assistant")
- **chatId:** Telegram chat ID (auto-filled from trigger)
- **botToken:** Bot token (use {{env.TELEGRAM_BOT_TOKEN}})
- **enabledTools:** Comma-separated list if not using visual connections
- **model:** Choose AI model (llama-3.3-70b, gpt-oss-120b, llama-3.1-8b)
- **maxIterations:** Max tool calls (default: 5)

**Outputs:**
- **response:** Final AI response
- **toolsUsed:** List of tools that were called
- **conversationHistory:** Full conversation with tool calls
- **success:** True if completed successfully

### Example Workflow

```
[Telegram Trigger] → [AI Agent]
                         ↓ (tool connections)
                    [Send Telegram]
                    [Jupiter Quote]
                    [Pump.fun Data]
```

When user sends "What's the price of SOL?":
1. AI Agent receives message
2. Decides to call Jupiter Quote tool
3. Gets price data
4. Decides to call Send Telegram tool
5. Sends price to user

### Tips

- Connect 2-5 tools max for best results
- Use clear systemMessage to guide behavior
- Test with Manual Trigger first
- Monitor credits usage (AI Agent uses 30 credits max per run)

---

## Workflow Activation & Triggers

Turn your workflows into **always-on bots** with one click!

### How Activation Works

1. Build workflow with trigger block (Telegram, Webhook, Schedule)
2. Click **"Activate"** toggle in workflow editor
3. AgentForge registers your triggers automatically
4. Workflow runs when trigger fires

### Telegram Trigger Activation

**Requirements:**
1. Telegram bot token (get from @BotFather)
2. Save token in Variables as `TELEGRAM_BOT_TOKEN`
3. Add Telegram Trigger block to workflow

**Activation:**
1. Click **"Activate"** toggle
2. AgentForge registers webhook with Telegram API
3. Your bot starts receiving messages
4. Workflow runs on every message

**Deactivation:**
1. Click **"Activate"** toggle again
2. Webhook unregistered
3. Bot stops responding

### Webhook Trigger Activation

**Activation:**
1. Add Webhook Trigger block
2. Click **"Activate"**
3. Get unique webhook URL: `https://api.agentforge.app/webhooks/generic/{workflowId}`
4. Share URL with services you want to integrate

**Usage:**
Send POST request to webhook URL:
```bash
curl -X POST https://api.agentforge.app/webhooks/generic/abc123 \
  -H "Content-Type: application/json" \
  -d '{"price": 100, "token": "SOL"}'
```

Workflow receives data in `{{webhook_trigger.body}}`

### Schedule Trigger Activation

**Configuration:**
1. Add Schedule Trigger block
2. Set cron schedule:
   - `0 * * * *` = Every hour
   - `*/5 * * * *` = Every 5 minutes
   - `0 9 * * 1` = Every Monday at 9am
3. Click **"Activate"**
4. Workflow runs on schedule

**Testing:**
- Use https://crontab.guru to test cron expressions
- Start with longer intervals while testing (avoid rapid credits usage)

### Activation Status

Visual indicators:
- 🟢 **Green "Active"** = Workflow is listening
- 🔴 **Gray "Inactive"** = Workflow is off
- ⚠️ **Yellow "Error"** = Activation failed (check variables)

---

**Send Telegram Message Block**
- Send message via Telegram bot
- Cost: 0 credits
- Inputs: message, chatId

**Solana Swap Execute Block**
- Execute token swap on Solana
- Cost: 5 credits
- Inputs: routePlan, slippageBps

### AI Blocks (Purple 🟣)

AI-powered analysis:

**LLM Analysis Block**
- Analyze text with AI
- Cost: 100 credits
- Inputs: text, prompt
- Output: analysis, confidence score

---

## Managing Credits

### Checking Balance

View your balance:
1. Sidebar shows current balance
2. Click **"Billing"** for detailed view

### Adding Credits

1. Go to **Billing** page
2. Click **"Add Credits"**
3. Choose amount:
   - **$10** = 10,000 credits
   - **$50** = 50,000 credits
   - **$100** = 100,000 credits
4. Click **"Proceed with Payment"**
5. In production: Sign transaction in Phantom
6. In development: Automatic simulation

### Understanding Costs

Each API call deducts credits:
- Simple calls (Jupiter, Helius): 1-2 credits
- AI analysis: 100 credits
- Swap execution: 5 credits
- Logic blocks: FREE

**Example:** A workflow with:
- 1x Jupiter Quote (1 credit)
- 1x Pump.fun Data (2 credits)
- 1x Filter (0 credits)
- 1x Telegram Send (0 credits)
**Total: 3 credits per run**

### Monitoring Usage

**Billing Dashboard** shows:
- **Today Usage** - Credits used today
- **Week Usage** - Credits used this week
- **Daily Average** - Estimated daily cost
- **Usage Chart** - 7-day history

---

## Deploying to Telegram

*(Coming in next update)*

### Create Telegram Bot

1. Open Telegram and find @BotFather
2. Send `/newbot`
3. Choose bot name and username
4. Save the bot token

### Deploy Workflow

1. Open your workflow
2. Click **"Deploy"** → **"Telegram"**
3. Paste bot token
4. Click **"Deploy"**

Your bot is now live! Test it:
1. Find your bot in Telegram
2. Send `/start`
3. Bot executes workflow and responds

---

## Best Practices

### 1. Test Before Deploying

Always test workflows manually before deployment:
- Click **"Run"** to test
- Check execution logs
- Verify output is correct

### 2. Monitor Credit Usage

Set up monitoring:
- Check daily usage in Billing
- Set budget alerts (coming soon)
- Optimize workflows to reduce costs

### 3. Error Handling

Add error handling to workflows:
- Use Conditional blocks for edge cases
- Test with invalid inputs
- Add fallback paths

### 4. Naming Conventions

Use clear names:
- ✅ `"Token Swap Bot - SOL to USDC"`
- ❌ `"Workflow 1"`

### 5. Save Frequently

Save your work often:
- Press **Ctrl+S** regularly
- Auto-save coming in future update

### 6. Optimize Costs

Reduce credit usage:
- Cache results when possible
- Use free logic blocks
- Batch API calls
- Only run when needed

---

## Keyboard Shortcuts

- **Ctrl+S** - Save workflow
- **Ctrl+Enter** - Run workflow
- **Delete** - Delete selected node
- **Ctrl+Z** - Undo (coming soon)
- **Ctrl+Shift+Z** - Redo (coming soon)

---

## Common Use Cases

### 1. Token Price Alerts

**Workflow:**
1. Jupiter Quote block - Get current price
2. Conditional block - Check if price > threshold
3. Send Telegram - Alert if condition met

**Schedule:** Run every 5 minutes

### 2. New Token Scanner

**Workflow:**
1. Pump.fun Data - Get new tokens
2. Filter - marketCap > 100k AND holderCount > 50
3. LLM Analysis - Analyze token description
4. Send Telegram - Send promising tokens

**Schedule:** Run every 15 minutes

### 3. Portfolio Tracker

**Workflow:**
1. Helius Balance - Get wallet balance
2. Jupiter Quote - Get prices for all tokens
3. Map - Calculate USD values
4. Send Telegram - Daily summary

**Schedule:** Run once daily at 9am

---

## Troubleshooting

### Workflow won't run

**Check:**
- Do you have enough credits?
- Are all required fields filled?
- Are blocks properly connected?

### Execution failed

**Common errors:**
- **Insufficient credits** - Add more credits
- **Invalid mint address** - Check token addresses
- **Network error** - Try again in a moment

### Can't connect blocks

**Solution:**
- Drag from **right edge** of source block
- Drop on **left edge** of target block
- Ensure data types match

---

## Getting Help

- **Documentation:** This guide + API.md
- **Support:** support@agentforge.app
- **Community:** Discord (coming soon)
- **Issues:** GitHub Issues

---

## Next Steps

1. ✅ Create your first workflow
2. ✅ Add credits
3. ✅ Test execution
4. 📱 Deploy to Telegram (coming soon)
5. 🎨 Explore block marketplace (coming soon)
6. 🤝 Share workflows with community (coming soon)

---

**Happy automating!** 🚀
