# AgentForge API Documentation

**Base URL:** `http://localhost:3001` (development)  
**Production:** `https://api.agentforge.app`

**Last Updated:** November 11, 2025  
**API Version:** 1.5

All API requests require JSON content type unless specified.

---

## Authentication

### POST /auth/phantom/login

Login with Phantom wallet signature.

**Request:**
```json
{
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "signature": "base64_encoded_signature",
  "message": "Sign this message to login to AgentForge..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "createdAt": "2025-11-06T12:00:00Z"
    },
    "token": "jwt_token_here"
  }
}
```

---

### POST /auth/telegram/login

Login with Telegram user ID.

**Request:**
```json
{
  "telegramUserId": 123456789,
  "username": "john_doe"
}
```

**Response:** Same as Phantom login

---

### GET /auth/me

Get current authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "credits": 50000,
    "createdAt": "2025-11-06T12:00:00Z"
  }
}
```

---

## Credits Management

### GET /api/credits/balance

Get user's credits balance.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 50000,
    "lastToppedUp": "2025-11-06T12:00:00Z",
    "totalPaid": 50.00
  }
}
```

---

### GET /api/credits/usage

Get usage statistics.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "todayUsage": 250,
    "weekUsage": 2100,
    "monthUsage": 8500,
    "estimateDailyCost": 300
  }
}
```

---

### POST /api/credits/prepay

Initiate x402 prepayment.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "amountUsd": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "amount": 50,
    "creditsIssued": 50000,
    "paymentUrl": "solana:wallet_address?amount=50",
    "expiresAt": "2025-11-06T12:10:00Z"
  }
}
```

---

### GET /api/credits/prepay/:txId/status

Check prepayment status.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "confirmed",
    "creditsGranted": 50000,
    "txHash": "5x7Kj..."
  }
}
```

---

### GET /api/credits/transactions

Get transaction history.

**Headers:** `Authorization: Bearer {token}`  
**Query:** `?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "txHash": "5x7Kj...",
        "amountUsd": 50,
        "creditsIssued": 50000,
        "status": "confirmed",
        "facilitator": "coinbase",
        "createdAt": "2025-11-06T12:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Workflow Variables

### GET /api/workflows/:id/variables

Get workflow environment variables.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "variables": [
      {
        "id": "uuid",
        "workflowId": "uuid",
        "key": "TELEGRAM_BOT_TOKEN",
        "value": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
        "description": "Telegram Bot Token from @BotFather",
        "isSecret": true,
        "isLocked": false,
        "createdAt": "2025-11-10T12:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/workflows/:id/variables

Create or update workflow variable.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "key": "TELEGRAM_BOT_TOKEN",
  "value": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
  "description": "Bot token from @BotFather",
  "isSecret": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workflowId": "uuid",
    "key": "TELEGRAM_BOT_TOKEN",
    "value": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
    "isSecret": true,
    "isLocked": false
  }
}
```

---

### PATCH /api/workflows/:id/variables/:variableId/lock

Lock or unlock a variable to prevent accidental changes.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "isLocked": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isLocked": true
  }
}
```

---

### DELETE /api/workflows/:id/variables/:variableId

Delete workflow variable.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

---

## Workflow Activation

### POST /api/workflows/:id/activate

Activate workflow and register triggers (Telegram, Webhook, Schedule).

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "uuid",
    "isActive": true,
    "activatedAt": "2025-11-10T12:00:00Z",
    "triggersRegistered": 2,
    "triggers": [
      {
        "type": "telegram",
        "config": {
          "webhookUrl": "https://api.agentforge.app/webhooks/telegram/uuid",
          "botUsername": "my_bot"
        }
      },
      {
        "type": "webhook",
        "config": {
          "webhookUrl": "https://api.agentforge.app/webhooks/generic/uuid"
        }
      }
    ]
  }
}
```

---

### POST /api/workflows/:id/deactivate

Deactivate workflow and unregister all triggers.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "uuid",
    "isActive": false,
    "triggersUnregistered": 2
  }
}
```

---

## AI Assistant

### GET /api/workflows/:id/chat

Get AI Assistant chat history for workflow.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "workflowId": "uuid",
        "role": "user",
        "content": "Create a Telegram bot that sends SOL price",
        "createdAt": "2025-11-10T12:00:00Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "I'll create a workflow with...",
        "metadata": {
          "workflow": {
            "nodes": [...],
            "edges": [...]
          }
        },
        "createdAt": "2025-11-10T12:00:30Z"
      }
    ]
  }
}
```

---

### POST /api/workflows/:id/chat

Send message to AI Assistant to generate workflow.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "message": "Create a Telegram bot that sends SOL price every hour",
  "currentWorkflow": {
    "nodes": [],
    "edges": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflow": {
      "nodes": [
        {
          "id": "node_1",
          "type": "schedule_trigger",
          "data": {
            "type": "schedule_trigger",
            "config": {
              "schedule": "0 * * * *"
            }
          }
        },
        {
          "id": "node_2",
          "type": "jupiter_token_info",
          "data": {...}
        }
      ],
      "edges": [...]
    },
    "explanation": "This workflow runs every hour...",
    "securityNotes": ["Never expose bot token", "..."],
    "nextSteps": ["Test the workflow", "..."]
  }
}
```

---

### DELETE /api/workflows/:id/chat

Clear AI Assistant chat history for workflow.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 15
  }
}
```

---

## Session Keys

### GET /api/session/config/:sessionId

Get session key request configuration (for Telegram authorization).

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "userId": "telegram_123456",
    "validUntil": "2025-11-10T18:00:00Z",
    "maxTransactions": 100,
    "maxAmountPerTx": 1000000000,
    "allowedPrograms": ["JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"],
    "status": "pending_auth"
  }
}
```

---

### POST /api/session/authorize

Complete session key authorization after user approval.

**Request:**
```json
{
  "sessionId": "uuid",
  "approved": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionKeyPublic": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "expiresAt": "2025-11-10T18:00:00Z",
    "maxTransactions": 100
  }
}
```

---

### POST /api/session/revoke

Revoke user session key.

**Request:**
```json
{
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "revoked": true,
    "revokedAt": "2025-11-10T14:00:00Z"
  }
}
```

---

### GET /api/session/info/:userId

Get user session information.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "sessionKeyPublic": "7xKXtg...",
        "isActive": true,
        "expiresAt": "2025-11-10T18:00:00Z",
        "transactionsUsed": 5,
        "maxTransactions": 100
      }
    ]
  }
}
```

---

## Webhooks

### POST /webhooks/telegram/:workflowId

Webhook endpoint for Telegram bot updates (auto-registered on activation).

**Request:** Telegram Update object

**Response:**
```json
{
  "ok": true
}
```

---

### POST /webhooks/generic/:workflowId

Generic webhook endpoint for manual integrations.

**Request:** Any JSON payload

**Response:**
```json
{
  "success": true,
  "executionId": "uuid"
}
```

---

## Execution Streaming

### GET /api/executions/:executionId/stream

Server-Sent Events stream for real-time execution updates.

**Headers:** `Authorization: Bearer {token}`

**Events:**
```
event: nodeStarted
data: {"executionId":"uuid","nodeId":"node_1","nodeType":"telegram_trigger","timestamp":"2025-11-10T12:00:00Z"}

event: nodeCompleted
data: {"executionId":"uuid","nodeId":"node_1","output":{...},"duration":123}

event: nodeFailed
data: {"executionId":"uuid","nodeId":"node_2","error":"Insufficient balance"}

event: executionCompleted
data: {"executionId":"uuid","status":"success","duration":1234,"creditsUsed":15}
```

---

## Workflows

### GET /api/workflows

List user's workflows.

**Headers:** `Authorization: Bearer {token}`  
**Query:** `?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "uuid",
        "name": "Token Swap Bot",
        "description": "Automated token swapping",
        "isActive": true,
        "deploymentType": "telegram",
        "createdAt": "2025-11-06T12:00:00Z",
        "updatedAt": "2025-11-06T13:00:00Z",
        "lastExecutedAt": "2025-11-06T13:30:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### POST /api/workflows

Create new workflow.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "My Workflow",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Workflow",
    "description": "Optional description",
    "canvasJson": "{\"nodes\":[],\"edges\":[]}",
    "isActive": false,
    "createdAt": "2025-11-06T12:00:00Z"
  }
}
```

---

### GET /api/workflows/:id

Get workflow details.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Workflow",
    "description": "Optional description",
    "canvasJson": "{\"nodes\":[...],\"edges\":[...]}",
    "isActive": true,
    "deploymentType": "telegram",
    "deploymentConfig": {...},
    "createdAt": "2025-11-06T12:00:00Z",
    "updatedAt": "2025-11-06T13:00:00Z",
    "lastExecutedAt": "2025-11-06T13:30:00Z"
  }
}
```

---

### PUT /api/workflows/:id

Update workflow.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "canvasJson": "{\"nodes\":[...],\"edges\":[...]}",
  "isActive": true
}
```

**Response:** Same as GET /api/workflows/:id

---

### DELETE /api/workflows/:id

Delete workflow.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

---

### POST /api/workflows/:id/run

Execute workflow.

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "inputs": {
    "someInput": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "uuid",
    "status": "success",
    "output": {
      "result": "..."
    },
    "executionTimeMs": 1234,
    "creditsUsed": 15
  }
}
```

---

### GET /api/workflows/:id/executions

Get workflow execution history.

**Headers:** `Authorization: Bearer {token}`  
**Query:** `?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "id": "uuid",
        "status": "success",
        "inputData": {...},
        "outputData": {...},
        "executionTimeMs": 1234,
        "apiCallsCount": 5,
        "creditsUsed": 15,
        "createdAt": "2025-11-06T13:30:00Z"
      }
    ],
    "total": 20,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Blocks

### GET /api/blocks

List available blocks.

**Response:**
```json
{
  "success": true,
  "data": {
    "blocks": [
      {
        "type": "jupiter_quote",
        "name": "Jupiter Swap Quote",
        "description": "Get a swap quote from Jupiter DEX aggregator",
        "category": "data",
        "inputs": [
          {
            "name": "inputMint",
            "type": "string",
            "required": true,
            "description": "Input token mint address"
          }
        ],
        "outputs": [
          {
            "name": "quote",
            "type": "object",
            "description": "Jupiter quote object"
          }
        ],
        "creditsCost": 1
      }
    ],
    "count": 10
  }
}
```

---

## Health Check

### GET /health

Check API health.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-11-06T12:00:00Z",
    "uptime": 12345.67
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `AUTHENTICATION_ERROR` (401) - Not authenticated
- `AUTHORIZATION_ERROR` (403) - No permission
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input
- `INSUFFICIENT_CREDITS` (402) - Not enough credits
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

### Insufficient Credits Error

```json
{
  "success": false,
  "error": "Insufficient credits. Required: 100, Available: 50",
  "code": "INSUFFICIENT_CREDITS",
  "required": 100,
  "available": 50,
  "topupUrl": "/settings/topup"
}
```

---

## Rate Limiting

- **100 requests/minute per user**
- **1000 requests/minute per IP**

Rate limit info in headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699276800
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Items per page

**Response includes:**
- `total` - Total items
- `page` - Current page
- `limit` - Items per page
- `totalPages` - Total pages

---

## Authentication Flow

1. User connects Phantom wallet
2. Frontend generates message: `"Sign this message to login to AgentForge.\n\nWallet: {address}\nTimestamp: {timestamp}"`
3. User signs message in Phantom
4. Frontend sends `walletAddress`, `signature`, `message` to `/auth/phantom/login`
5. Backend verifies signature
6. Backend returns JWT token
7. Frontend stores token in localStorage
8. Frontend sends token in `Authorization: Bearer {token}` header for all requests

---

## Credits System

- **1 credit = $0.001 USD**
- Credits are prepaid via x402
- Credits never expire
- Credits are deducted per API call:
  - Jupiter Quote: 1 credit
  - Pump.fun Data: 2 credits
  - Helius RPC: 1 credit
  - LLM Analysis: 100 credits
  - Solana Swap: 5 credits
  - Logic blocks (filter, map): 0 credits

---

**For support:** support@agentforge.app
