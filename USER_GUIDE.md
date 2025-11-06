# AgentForge User Guide

Welcome to AgentForge! This guide will help you create your first automated workflow.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Workflow](#creating-your-first-workflow)
3. [Understanding Blocks](#understanding-blocks)
4. [Managing Credits](#managing-credits)
5. [Deploying to Telegram](#deploying-to-telegram)
6. [Best Practices](#best-practices)

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

## Understanding Blocks

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
