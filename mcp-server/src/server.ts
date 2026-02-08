// FIX: Disable strict SSL validation for Supabase Pooler
// Must be set before any TLS-related imports
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import express from 'express';
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Load .env from project root (one level up from mcp-server)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: envPath });

// Fallback to default .env lookup if specific path failed or didn't exist
if (!process.env.DATABASE_URL) {
    dotenv.config();
}

const { Pool } = pg;

// Use the same SSL configuration as the main application
// REQUIRED for Supabase pooler which uses self-signed certificates
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // REQUIRED for Supabase pooler
    },
});

// Create MCP Server instance (same as index.ts)
const mcpServer = new Server(
    {
        name: "budget-track-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Set up MCP server handlers (same as index.ts)
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_expenses",
                description: "List recent expenses for the user",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number", description: "Number of expenses to return", default: 10 },
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                },
            },
            {
                name: "add_expense",
                description: "Add a new expense entry",
                inputSchema: {
                    type: "object",
                    properties: {
                        description: { type: "string", description: "What was the expense for?" },
                        amount: { type: "number", description: "How much was spent?" },
                        category: { type: "string", description: "Expense category (e.g., food, transport, bills)", default: "other" },
                        note: { type: "string", description: "Optional note about the expense" },
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                    required: ["description", "amount"],
                },
            },
            {
                name: "list_income",
                description: "List recent income sources",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                },
            },
            {
                name: "add_income",
                description: "Add a new income source",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Name of the income source (e.g., Salary, Freelance)" },
                        amount: { type: "number", description: "Amount of income" },
                        frequency: { type: "string", enum: ["monthly", "weekly", "bi-weekly", "yearly"], default: "monthly" },
                        description: { type: "string", description: "Optional description" },
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                    required: ["name", "amount"],
                },
            },
            {
                name: "get_budget_summary",
                description: "Provides a summary of total income, total expenses, and balance",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                },
            },
        ],
    };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;
    const userId = (args?.userId as number) || 1;

    try {
        switch (name) {
            case "list_expenses": {
                const limit = (args?.limit as number) || 10;
                const expenses = await handleListExpenses(userId, limit);
                return {
                    content: [{ type: "text", text: JSON.stringify(expenses, null, 2) }],
                };
            }

            case "add_expense": {
                const { description, amount, category, note } = args as any;
                const expense = await handleAddExpense(userId, description, amount, category, note);
                return {
                    content: [{ type: "text", text: `Expense added: ${JSON.stringify(expense, null, 2)}` }],
                };
            }

            case "list_income": {
                const income = await handleListIncome(userId);
                return {
                    content: [{ type: "text", text: JSON.stringify(income, null, 2) }],
                };
            }

            case "add_income": {
                const { name: incomeName, amount, frequency, description } = args as any;
                const income = await handleAddIncome(userId, incomeName, amount, frequency, description);
                return {
                    content: [{ type: "text", text: `Income added: ${JSON.stringify(income, null, 2)}` }],
                };
            }

            case "get_budget_summary": {
                const summary = await handleGetBudgetSummary(userId);
                return {
                    content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
});

// Create Express app for production HTTP server
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'budget-track-mcp-server' });
});

// Tool handlers (same logic as index.ts)
async function handleListExpenses(userId: number, limit: number = 10) {
    const result = await pool.query(
        "SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT $2",
        [userId, limit]
    );
    return result.rows;
}

async function handleAddExpense(userId: number, description: string, amount: number, category?: string, note?: string) {
    const result = await pool.query(
        `INSERT INTO expenses (description, amount, category, note, user_id, date)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [description, amount, category || "other", note || null, userId]
    );
    return result.rows[0];
}

async function handleListIncome(userId: number) {
    const result = await pool.query(
        "SELECT * FROM income_sources WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
    );
    return result.rows;
}

async function handleAddIncome(userId: number, name: string, amount: number, frequency?: string, description?: string) {
    const result = await pool.query(
        `INSERT INTO income_sources (name, amount, frequency, description, user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, amount, frequency || "monthly", description || null, userId]
    );
    return result.rows[0];
}

async function handleGetBudgetSummary(userId: number) {
    const incomeResult = await pool.query(
        "SELECT SUM(amount) as total FROM income_sources WHERE user_id = $1",
        [userId]
    );
    const totalIncome = parseFloat(incomeResult.rows[0].total || "0");

    const expenseResult = await pool.query(
        `SELECT SUM(amount) as total FROM expenses 
         WHERE user_id = $1 AND date >= date_trunc('month', now())`,
        [userId]
    );
    const totalExpenses = parseFloat(expenseResult.rows[0].total || "0");

    return {
        monthly_income: totalIncome,
        expenses_this_month: totalExpenses,
        balance: totalIncome - totalExpenses,
        currency: "USD"
    };
}

// MCP-compatible endpoints
app.get('/mcp/tools', (req, res) => {
    res.json({
        tools: [
            {
                name: "list_expenses",
                description: "List recent expenses for the user",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number", description: "Number of expenses to return", default: 10 },
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                },
            },
            {
                name: "add_expense",
                description: "Add a new expense entry",
                inputSchema: {
                    type: "object",
                    properties: {
                        description: { type: "string", description: "What was the expense for?" },
                        amount: { type: "number", description: "How much was spent?" },
                        category: { type: "string", description: "Expense category (e.g., food, transport, bills)", default: "other" },
                        note: { type: "string", description: "Optional note about the expense" },
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                    required: ["description", "amount"],
                },
            },
            {
                name: "list_income",
                description: "List recent income sources",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                },
            },
            {
                name: "add_income",
                description: "Add a new income source",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Name of the income source (e.g., Salary, Freelance)" },
                        amount: { type: "number", description: "Amount of income" },
                        frequency: { type: "string", enum: ["monthly", "weekly", "bi-weekly", "yearly"], default: "monthly" },
                        description: { type: "string", description: "Optional description" },
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                    required: ["name", "amount"],
                },
            },
            {
                name: "get_budget_summary",
                description: "Provides a summary of total income, total expenses, and balance",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                    },
                },
            },
        ],
    });
});

app.post('/mcp/tools/call', async (req, res) => {
    try {
        const { name, arguments: args } = req.body;
        if (!name) {
            return res.status(400).json({ 
                content: [{ type: "text", text: "Error: Tool name is required" }],
                isError: true 
            });
        }

        const userId = (args?.userId as number) || 1;
        let result: any;

        switch (name) {
            case "list_expenses": {
                const limit = (args?.limit as number) || 10;
                const expenses = await handleListExpenses(userId, limit);
                result = {
                    content: [{ type: "text", text: JSON.stringify(expenses, null, 2) }],
                };
                break;
            }

            case "add_expense": {
                const { description, amount, category, note } = args as any;
                if (!description || amount === undefined) {
                    return res.status(400).json({
                        content: [{ type: "text", text: "Error: description and amount are required" }],
                        isError: true
                    });
                }
                const expense = await handleAddExpense(userId, description, amount, category, note);
                result = {
                    content: [{ type: "text", text: `Expense added: ${JSON.stringify(expense, null, 2)}` }],
                };
                break;
            }

            case "list_income": {
                const income = await handleListIncome(userId);
                result = {
                    content: [{ type: "text", text: JSON.stringify(income, null, 2) }],
                };
                break;
            }

            case "add_income": {
                const { name: incomeName, amount, frequency, description } = args as any;
                if (!incomeName || amount === undefined) {
                    return res.status(400).json({
                        content: [{ type: "text", text: "Error: name and amount are required" }],
                        isError: true
                    });
                }
                const income = await handleAddIncome(userId, incomeName, amount, frequency, description);
                result = {
                    content: [{ type: "text", text: `Income added: ${JSON.stringify(income, null, 2)}` }],
                };
                break;
            }

            case "get_budget_summary": {
                const summary = await handleGetBudgetSummary(userId);
                result = {
                    content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
                };
                break;
            }

            default:
                return res.status(400).json({
                    content: [{ type: "text", text: `Error: Unknown tool: ${name}` }],
                    isError: true
                });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        });
    }
});

// ChatGPT-friendly REST endpoints
app.get('/api/expenses', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const expenses = await handleListExpenses(userId, limit);
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ 
            error: error instanceof Error ? error.message : String(error) 
        });
    }
});

app.post('/api/expenses', async (req, res) => {
    try {
        const { description, amount, category, note, userId } = req.body;
        if (!description || amount === undefined) {
            return res.status(400).json({ error: 'description and amount are required' });
        }
        const expense = await handleAddExpense(userId || 1, description, amount, category, note);
        res.json(expense);
    } catch (error) {
        res.status(500).json({ 
            error: error instanceof Error ? error.message : String(error) 
        });
    }
});

app.get('/api/income', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const income = await handleListIncome(userId);
        res.json(income);
    } catch (error) {
        res.status(500).json({ 
            error: error instanceof Error ? error.message : String(error) 
        });
    }
});

app.post('/api/income', async (req, res) => {
    try {
        const { name, amount, frequency, description, userId } = req.body;
        if (!name || amount === undefined) {
            return res.status(400).json({ error: 'name and amount are required' });
        }
        const income = await handleAddIncome(userId || 1, name, amount, frequency, description);
        res.json(income);
    } catch (error) {
        res.status(500).json({ 
            error: error instanceof Error ? error.message : String(error) 
        });
    }
});

app.get('/api/budget/summary', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const summary = await handleGetBudgetSummary(userId);
        res.json(summary);
    } catch (error) {
        res.status(500).json({ 
            error: error instanceof Error ? error.message : String(error) 
        });
    }
});

// OpenAPI schema endpoint for ChatGPT
app.get('/.well-known/openapi.yaml', (req, res) => {
    res.redirect('/openapi.yaml');
});

app.get('/openapi.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(`
openapi: 3.1.0
info:
  title: Budget Track API
  description: API for managing personal budget, expenses, and income tracking
  version: 1.0.0
servers:
  - url: ${req.protocol}://${req.get('host')}
    description: Current server
paths:
  /api/expenses:
    get:
      summary: List expenses
      operationId: listExpenses
      parameters:
        - name: userId
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        '200':
          description: List of expenses
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
    post:
      summary: Add a new expense
      operationId: addExpense
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - description
                - amount
              properties:
                description:
                  type: string
                amount:
                  type: number
                category:
                  type: string
                note:
                  type: string
                userId:
                  type: integer
                  default: 1
      responses:
        '200':
          description: Expense added successfully
  /api/income:
    get:
      summary: List income sources
      operationId: listIncome
      parameters:
        - name: userId
          in: query
          schema:
            type: integer
            default: 1
      responses:
        '200':
          description: List of income sources
    post:
      summary: Add a new income source
      operationId: addIncome
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - amount
              properties:
                name:
                  type: string
                amount:
                  type: number
                frequency:
                  type: string
                  enum: [monthly, weekly, bi-weekly, yearly]
                  default: monthly
                description:
                  type: string
                userId:
                  type: integer
                  default: 1
      responses:
        '200':
          description: Income added successfully
  /api/budget/summary:
    get:
      summary: Get budget summary
      operationId: getBudgetSummary
      parameters:
        - name: userId
          in: query
          schema:
            type: integer
            default: 1
      responses:
        '200':
          description: Budget summary with income, expenses, and balance
`);
});

// SSE endpoint for ChatGPT MCP connection
// Handle both GET (SSE streaming) and POST (JSON-RPC) requests
app.get('/sse', async (req, res) => {
    // Get token from query parameter or Authorization header
    const token = req.query.token as string || req.headers.authorization?.replace('Bearer ', '');
    
    // Validate token is provided
    if (!token) {
        res.status(401);
        res.write('data: ' + JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32001,
                message: 'Authentication required: MCP token is missing. Please provide a valid token in the URL query parameter (?token=...) or Authorization header.'
            }
        }) + '\n\n');
        res.end();
        return;
    }

    // Validate token is valid
    const tokenInfo = await getUserIdFromToken(token);
    if (!tokenInfo.userId) {
        res.status(401);
        res.write('data: ' + JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32001,
                message: 'Invalid or expired MCP token. Please generate a new token from your Budget Tracker account.'
            }
        }) + '\n\n');
        res.end();
        return;
    }

    console.log(`✅ SSE connection established for user: ${tokenInfo.email || tokenInfo.username} (ID: ${tokenInfo.userId})`);
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Authorization');

    // Send initial connection message
    res.write(': connected\n\n');

    // Handle incoming messages from client
    let buffer = '';
    req.on('data', async (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
                try {
                    const jsonStr = line.substring(6); // Remove 'data: ' prefix
                    const message = JSON.parse(jsonStr);
                    // Handle MCP protocol messages with token
                    await handleMCPMessage(message, res, token);
                } catch (error) {
                    console.error('Error parsing SSE message:', error);
                }
            } else if (line.trim()) {
                try {
                    const message = JSON.parse(line);
                    await handleMCPMessage(message, res, token);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            }
        }
    });

    req.on('close', () => {
        res.end();
    });
});

// Token validation helper
async function getUserIdFromToken(token?: string): Promise<{ userId: number | null; email?: string; username?: string }> {
    if (!token) {
        console.warn('⚠️  MCP request without token - will use default user_id=1');
        return { userId: null };
    }
    
    try {
        const result = await pool.query(
            `SELECT mcp_tokens.user_id, users.email, users.username 
             FROM mcp_tokens
             JOIN users ON mcp_tokens.user_id = users.id
             WHERE mcp_tokens.token = $1 AND mcp_tokens.expires_at > NOW()
             LIMIT 1`,
            [token]
        );
        
        if (result.rows.length === 0) {
            console.warn(`⚠️  Invalid or expired token: ${token.substring(0, 10)}... - will use default user_id=1`);
            return { userId: null };
        }
        
        const userInfo = result.rows[0];
        console.log(`✅ Token validated - User: ${userInfo.email || userInfo.username} (ID: ${userInfo.user_id})`);
        return { 
            userId: userInfo.user_id,
            email: userInfo.email,
            username: userInfo.username
        };
    } catch (error) {
        console.error('Error validating token:', error);
        return { userId: null };
    }
}

// Handle MCP protocol messages over SSE
async function handleMCPMessage(message: any, res: express.Response, token?: string) {
    try {
        let response: any;
        
        // Get user ID from token (REQUIRED)
        if (!token) {
            const errorResponse = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                    code: -32001,
                    message: 'Authentication required: MCP token is missing. Please provide a valid token in the URL query parameter (?token=...) or Authorization header.'
                }
            };
            res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
            return;
        }

        const tokenInfo = await getUserIdFromToken(token);
        
        if (!tokenInfo.userId) {
            const errorResponse = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                    code: -32001,
                    message: 'Invalid or expired MCP token. Please generate a new token from your Budget Tracker account.'
                }
            };
            res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
            return;
        }
        
        const defaultUserId = tokenInfo.userId;
        
        // Log which user is being used
        console.log(`📝 MCP request from user: ${tokenInfo.email || tokenInfo.username} (ID: ${tokenInfo.userId})`);

        // Handle MCP initialize method
        if (message.method === 'initialize') {
            response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {}
                    },
                    serverInfo: {
                        name: 'budget-track-mcp-server',
                        version: '1.0.0'
                    }
                }
            };
        } else if (message.method === 'tools/list') {
            // Get tools list
            const toolsResponse = {
                tools: [
                    {
                        name: "list_expenses",
                        description: "List recent expenses for the user",
                        inputSchema: {
                            type: "object",
                            properties: {
                                limit: { type: "number", description: "Number of expenses to return", default: 10 },
                                userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                            },
                        },
                    },
                    {
                        name: "add_expense",
                        description: "Add a new expense entry",
                        inputSchema: {
                            type: "object",
                            properties: {
                                description: { type: "string", description: "What was the expense for?" },
                                amount: { type: "number", description: "How much was spent?" },
                                category: { type: "string", description: "Expense category (e.g., food, transport, bills)", default: "other" },
                                note: { type: "string", description: "Optional note about the expense" },
                                userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                            },
                            required: ["description", "amount"],
                        },
                    },
                    {
                        name: "list_income",
                        description: "List recent income sources",
                        inputSchema: {
                            type: "object",
                            properties: {
                                userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                            },
                        },
                    },
                    {
                        name: "add_income",
                        description: "Add a new income source",
                        inputSchema: {
                            type: "object",
                            properties: {
                                name: { type: "string", description: "Name of the income source (e.g., Salary, Freelance)" },
                                amount: { type: "number", description: "Amount of income" },
                                frequency: { type: "string", enum: ["monthly", "weekly", "bi-weekly", "yearly"], default: "monthly" },
                                description: { type: "string", description: "Optional description" },
                                userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                            },
                            required: ["name", "amount"],
                        },
                    },
                    {
                        name: "get_budget_summary",
                        description: "Provides a summary of total income, total expenses, and balance",
                        inputSchema: {
                            type: "object",
                            properties: {
                                userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                            },
                        },
                    },
                ],
            };
            response = {
                jsonrpc: '2.0',
                id: message.id,
                result: toolsResponse
            };
        } else if (message.method === 'tools/call') {
            // Handle tool call
            const { name, arguments: args } = message.params;
            const userId = (args?.userId as number) || 1;
            let result: any;

            switch (name) {
                case "list_expenses": {
                    const limit = (args?.limit as number) || 10;
                    const expenses = await handleListExpenses(userId, limit);
                    result = {
                        content: [{ type: "text", text: JSON.stringify(expenses, null, 2) }],
                    };
                    break;
                }
                case "add_expense": {
                    const { description, amount, category, note } = args as any;
                    const expense = await handleAddExpense(userId, description, amount, category, note);
                    result = {
                        content: [{ type: "text", text: `Expense added: ${JSON.stringify(expense, null, 2)}` }],
                    };
                    break;
                }
                case "list_income": {
                    const income = await handleListIncome(userId);
                    result = {
                        content: [{ type: "text", text: JSON.stringify(income, null, 2) }],
                    };
                    break;
                }
                case "add_income": {
                    const { name: incomeName, amount, frequency, description } = args as any;
                    const income = await handleAddIncome(userId, incomeName, amount, frequency, description);
                    result = {
                        content: [{ type: "text", text: `Income added: ${JSON.stringify(income, null, 2)}` }],
                    };
                    break;
                }
                case "get_budget_summary": {
                    const summary = await handleGetBudgetSummary(userId);
                    result = {
                        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
                    };
                    break;
                }
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }

            response = {
                jsonrpc: '2.0',
                id: message.id,
                result: result
            };
        } else {
            response = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                    code: -32601,
                    message: 'Method not found'
                }
            };
        }

        // Send response as SSE
        res.write(`data: ${JSON.stringify(response)}\n\n`);
    } catch (error) {
        const errorResponse = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
                code: -32000,
                message: error instanceof Error ? error.message : String(error)
            }
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    }
}

// POST endpoint for MCP messages (alternative to SSE for some clients)
app.post('/sse', express.json(), async (req, res) => {
    try {
        // Get token from query parameter or Authorization header (REQUIRED)
        const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                    code: -32001,
                    message: 'Authentication required: MCP token is missing. Please provide a valid token in the URL query parameter (?token=...) or Authorization header.'
                }
            });
        }

        const tokenInfo = await getUserIdFromToken(token);
        
        if (!tokenInfo.userId) {
            return res.status(401).json({
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                    code: -32001,
                    message: 'Invalid or expired MCP token. Please generate a new token from your Budget Tracker account.'
                }
            });
        }
        
        const defaultUserId = tokenInfo.userId;
        
        // Log which user is being used
        console.log(`📝 MCP POST request from user: ${tokenInfo.email || tokenInfo.username} (ID: ${tokenInfo.userId})`);
        
        const message = req.body;
        let response: any;

        // Handle MCP initialize method
        if (message.method === 'initialize') {
            response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {}
                    },
                    serverInfo: {
                        name: 'budget-track-mcp-server',
                        version: '1.0.0'
                    }
                }
            };
        } else if (message.method === 'tools/list') {
            // Return tools list (same as GET /mcp/tools)
            response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    tools: [
                        {
                            name: "list_expenses",
                            description: "List recent expenses for the user",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    limit: { type: "number", description: "Number of expenses to return", default: 10 },
                                    userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                                },
                            },
                        },
                        {
                            name: "add_expense",
                            description: "Add a new expense entry",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    description: { type: "string", description: "What was the expense for?" },
                                    amount: { type: "number", description: "How much was spent?" },
                                    category: { type: "string", description: "Expense category (e.g., food, transport, bills)", default: "other" },
                                    note: { type: "string", description: "Optional note about the expense" },
                                    userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                                },
                                required: ["description", "amount"],
                            },
                        },
                        {
                            name: "list_income",
                            description: "List recent income sources",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                                },
                            },
                        },
                        {
                            name: "add_income",
                            description: "Add a new income source",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    name: { type: "string", description: "Name of the income source (e.g., Salary, Freelance)" },
                                    amount: { type: "number", description: "Amount of income" },
                                    frequency: { type: "string", enum: ["monthly", "weekly", "bi-weekly", "yearly"], default: "monthly" },
                                    description: { type: "string", description: "Optional description" },
                                    userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                                },
                                required: ["name", "amount"],
                            },
                        },
                        {
                            name: "get_budget_summary",
                            description: "Provides a summary of total income, total expenses, and balance",
                            inputSchema: {
                                type: "object",
                                properties: {
                                    userId: { type: "number", description: "User ID (defaults to 1 if not specified)", default: 1 }
                                },
                            },
                        },
                    ],
                }
            };
        } else if (message.method === 'tools/call') {
            // Handle tool call directly
            const { name, arguments: args } = message.params;
            const userId = (args?.userId as number) || 1;
            let result: any;

            switch (name) {
                case "list_expenses": {
                    const limit = (args?.limit as number) || 10;
                    const expenses = await handleListExpenses(defaultUserId, limit);
                    result = {
                        content: [{ type: "text", text: JSON.stringify(expenses, null, 2) }],
                    };
                    break;
                }
                case "add_expense": {
                    const { description, amount, category, note } = args as any;
                    const expense = await handleAddExpense(defaultUserId, description, amount, category, note);
                    result = {
                        content: [{ type: "text", text: `Expense added: ${JSON.stringify(expense, null, 2)}` }],
                    };
                    break;
                }
                case "list_income": {
                    const income = await handleListIncome(defaultUserId);
                    result = {
                        content: [{ type: "text", text: JSON.stringify(income, null, 2) }],
                    };
                    break;
                }
                case "add_income": {
                    const { name: incomeName, amount, frequency, description } = args as any;
                    const income = await handleAddIncome(defaultUserId, incomeName, amount, frequency, description);
                    result = {
                        content: [{ type: "text", text: `Income added: ${JSON.stringify(income, null, 2)}` }],
                    };
                    break;
                }
                case "get_budget_summary": {
                    const summary = await handleGetBudgetSummary(defaultUserId);
                    result = {
                        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
                    };
                    break;
                }
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }

            response = {
                jsonrpc: '2.0',
                id: message.id,
                result: result
            };
        } else {
            response = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                    code: -32601,
                    message: 'Method not found'
                }
            };
        }

        res.json(response);
    } catch (error) {
        res.status(500).json({
            jsonrpc: '2.0',
            id: req.body.id,
            error: {
                code: -32000,
                message: error instanceof Error ? error.message : String(error)
            }
        });
    }
});

// Start HTTP server
app.listen(PORT, () => {
    console.log(`Budget Track MCP server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`MCP tools: http://localhost:${PORT}/mcp/tools`);
    console.log(`SSE endpoint (for ChatGPT): http://localhost:${PORT}/sse`);
    console.log(`OpenAPI schema: http://localhost:${PORT}/openapi.yaml`);
    console.log(`ChatGPT endpoints: http://localhost:${PORT}/api/expenses, /api/income, /api/budget/summary`);
});
