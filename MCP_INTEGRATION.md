# Integration Guide: Budget Track MCP Server

This guide explains how to connect your Budget Track data to Claude Desktop and Cursor using the Model Context Protocol (MCP).

## Prerequisites
- Node.js installed on your machine.
- The `DATABASE_URL` for your budget_track application.

## 1. Build the MCP Server
Ensure the server is built:
```bash
cd c:\Users\Piranav\Documents\budget_track\mcp-server
npm install
npm run build
```

## 2. Claude Desktop Integration

1. Open your Claude Desktop configuration file:
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add the following to the `mcpServers` object:

```json
{
  "mcpServers": {
    "budget-track": {
      "command": "node",
      "args": [
        "c:/Users/Piranav/Documents/budget_track/mcp-server/dist/index.js"
      ]
    }
  }
}
```

> [!NOTE]
> The server automatically loads your database configuration from the `.env` file in the project root.

3. Restart Claude Desktop.

## 3. Cursor Integration

1. Open Cursor Settings (Ctrl+Shift+J or Cmd+Shift+J).
2. Go to **Features** > **MCP**.
3. Click **+ Add New MCP Server**.
4. Configure it as follows:
   - **Name:** Budget Track
   - **Type:** command
   - **Command:** `node c:/Users/Piranav/Documents/budget_track/mcp-server/dist/index.js`
5. Note: In Cursor, you might need to set the environment variable in your shell or use a tool that loads `.env` if Cursor doesn't support inline env variables for MCP commands yet. Alternatively, you can modify `src/index.ts` to hardcode or load from a specific file if needed (though not recommended for security).

## Available Tools

- `list_expenses`: View your recent spending.
- `add_expense`: Record a new expense.
- `list_income`: View your income sources.
- `add_income`: Record new income.
- `get_budget_summary`: Get a quick overview of your finances.

## Testing Prompts

Try these prompts in Claude to verify the integration:

1.  **Add an Expense:**
    > "I just spent $15.50 on lunch at McDonald's. Add this to my expenses."

2.  **View Expenses:**
    > "Show me my recent expenses."

3.  **Add Income:**
    > "I received a freelance payment of $500 today."

4.  **Check Budget:**
    > "What is my current budget summary? How much have I spent this month vs my income?"
