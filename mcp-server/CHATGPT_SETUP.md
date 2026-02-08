# ChatGPT Integration Guide

This guide explains how to connect your Budget Track MCP server to ChatGPT using Custom GPTs or ChatGPT Actions.

## Prerequisites

1. Deploy your MCP server to production (see [DEPLOYMENT.md](./DEPLOYMENT.md))
2. Get your production server URL (e.g., `https://your-server.com`)
3. Have a ChatGPT Plus or Enterprise account (required for Custom GPTs)

## Option 1: ChatGPT MCP Server Connection (New - Recommended)

ChatGPT now supports direct MCP server connections! This is the easiest way to connect.

### Step 1: Get Your MCP Token (Required)

**IMPORTANT**: You must verify your identity before connecting to ensure your data is linked to your account.

1. **Log into your Budget Tracker web app**
2. **Navigate to `/mcp-connection`** (or Settings → MCP Connection)
3. **Click "Send Verification Code"**
   - A 6-digit code will be sent to your email
4. **Enter the verification code** from your email
5. **Copy the MCP Server URL** (it includes your unique token)

> **Note**: The token ensures your ChatGPT session is linked to your account. Without it, the server uses a default user ID.

### Step 2: Connect in ChatGPT

1. In ChatGPT, click on **"New App (BETA)"** or go to the MCP server settings
2. Fill in the form:
   - **Name**: "Budget Tracker" or "Personal Finance Assistant"
   - **Description**: "Helps you track expenses, income, and manage your budget"
   - **MCP Server URL**: Paste the URL from Step 1 (includes your token)
     - Format: `https://your-server.com/sse?token=YOUR_TOKEN`
   - **Authentication**: Set to **"No Auth"**
3. Check the consent checkbox: "I understand and want to continue"
4. Click **"Create"**

### Step 3: Test It

Once connected, try these prompts:
- "Add an expense of $15.50 for lunch at McDonald's"
- "Show me my recent expenses"
- "What's my budget summary?"
- "Add a monthly income of $5000 from my salary"

### Token Expiration

- MCP tokens expire after **30 days**
- If your connection stops working, generate a new token from `/mcp-connection`
- Each user gets their own token linked to their account

## Option 2: Custom GPT (Alternative)

Custom GPTs allow you to create a specialized ChatGPT that can call your API.

### Step 1: Create a Custom GPT

1. Go to [ChatGPT](https://chat.openai.com)
2. Click on your profile → **"My GPTs"** or go to [gpt.creator.openai.com](https://gpt.creator.openai.com)
3. Click **"Create"** or **"+"** to create a new GPT

### Step 2: Configure the GPT

1. **Name**: "Budget Tracker" or "Personal Finance Assistant"
2. **Description**: "Helps you track expenses, income, and manage your budget"
3. **Instructions**: Add the following:

```
You are a helpful personal finance assistant that helps users track their expenses and income.

You can:
- Add expenses (description, amount, category)
- List recent expenses
- Add income sources
- List income sources
- Get budget summaries

Always be friendly and helpful. When adding expenses, ask for the amount and description if not provided.
```

### Step 3: Add Actions (API Integration)

1. In the GPT editor, go to the **"Actions"** tab
2. Click **"Create new action"**
3. Click **"Import from URL"**
4. Enter your OpenAPI schema URL:
   ```
   https://your-server.com/openapi.yaml
   ```
5. Click **"Import"**

Alternatively, you can paste the schema directly:

1. Click **"Create new action"**
2. Click **"Schema"** tab
3. Paste the OpenAPI schema from `chatgpt-actions.json` (update the server URL)
4. Save

### Step 4: Test the Integration

Try these prompts in your Custom GPT:
- "Add an expense of $15.50 for lunch at McDonald's"
- "Show me my recent expenses"
- "What's my budget summary?"
- "Add a monthly income of $5000 from my salary"

## Option 2: ChatGPT Actions (Function Calling)

If you're building a ChatGPT plugin or using the API directly, you can use function calling.

### API Endpoints

Your server exposes these REST endpoints:

#### List Expenses
```http
GET /api/expenses?userId=1&limit=10
```

#### Add Expense
```http
POST /api/expenses
Content-Type: application/json

{
  "description": "Lunch at McDonald's",
  "amount": 15.50,
  "category": "food",
  "note": "Quick lunch",
  "userId": 1
}
```

#### List Income
```http
GET /api/income?userId=1
```

#### Add Income
```http
POST /api/income
Content-Type: application/json

{
  "name": "Salary",
  "amount": 5000,
  "frequency": "monthly",
  "description": "Monthly salary",
  "userId": 1
}
```

#### Get Budget Summary
```http
GET /api/budget/summary?userId=1
```

### Using with ChatGPT API

When using the ChatGPT API with function calling, define your functions like this:

```json
{
  "type": "function",
  "function": {
    "name": "add_expense",
    "description": "Add a new expense to the budget tracker",
    "parameters": {
      "type": "object",
      "properties": {
        "description": {
          "type": "string",
          "description": "What was the expense for?"
        },
        "amount": {
          "type": "number",
          "description": "How much was spent?"
        },
        "category": {
          "type": "string",
          "description": "Expense category",
          "enum": ["food", "transport", "bills", "entertainment", "shopping", "other"]
        },
        "userId": {
          "type": "integer",
          "description": "User ID",
          "default": 1
        }
      },
      "required": ["description", "amount"]
    }
  }
}
```

## Option 3: Direct API Calls from ChatGPT

You can also instruct ChatGPT to make direct HTTP calls to your API:

1. Share your API endpoint with ChatGPT
2. Ask ChatGPT to make API calls using the provided endpoints
3. ChatGPT can use the REST API directly

Example prompt:
```
I have a budget tracking API at https://your-server.com. 
The endpoints are:
- GET /api/expenses?userId=1 to list expenses
- POST /api/expenses with JSON body to add expenses
- GET /api/budget/summary?userId=1 for budget summary

Help me add an expense of $25 for groceries.
```

## Security Considerations

### For Production:

1. **Add Authentication**: Implement API key authentication
2. **Use HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **CORS**: Configure CORS to only allow your ChatGPT instance

### Adding API Key Authentication

Update `mcp-server/src/server.ts` to add API key middleware:

```typescript
const API_KEY = process.env.API_KEY;

app.use('/api', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!API_KEY || apiKey === API_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});
```

Then set the API key in your Custom GPT Actions configuration.

## Testing

1. **Health Check**: 
   ```bash
   curl https://your-server.com/health
   ```

2. **Test Endpoints**:
   ```bash
   # List expenses
   curl https://your-server.com/api/expenses?userId=1
   
   # Add expense
   curl -X POST https://your-server.com/api/expenses \
     -H "Content-Type: application/json" \
     -d '{"description": "Test", "amount": 10, "userId": 1}'
   ```

## Troubleshooting

### ChatGPT can't connect to your server

1. **Check CORS**: Ensure CORS is enabled for `https://chat.openai.com`
2. **Check HTTPS**: ChatGPT requires HTTPS (not HTTP)
3. **Check Server Status**: Verify your server is running and accessible
4. **Check OpenAPI Schema**: Ensure `/openapi.yaml` is accessible

### Actions not working

1. **Verify Schema**: Check that your OpenAPI schema is valid
2. **Check Authentication**: If using API keys, ensure they're configured correctly
3. **Check Logs**: Review server logs for errors

### Rate Limiting

If you hit rate limits:
- Implement caching where appropriate
- Add rate limiting middleware
- Consider upgrading your hosting plan

## Next Steps

1. Deploy your server to production
2. Create a Custom GPT
3. Add the OpenAPI schema
4. Test with sample queries
5. Share your Custom GPT with others (optional)

## Example Prompts for Your Custom GPT

- "Add an expense of $50 for groceries"
- "Show me my last 5 expenses"
- "What's my current budget balance?"
- "Add a monthly income of $3000 from my job"
- "How much have I spent this month on food?"

