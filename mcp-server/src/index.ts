// FIX: Disable strict SSL validation for Supabase Pooler
// Must be set before any TLS-related imports
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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

const server = new Server(
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

/**
 * Tool definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
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

/**
 * Tool handlers
 */
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;
    const userId = (args?.userId as number) || 1;

    try {
        switch (name) {
            case "list_expenses": {
                const limit = (args?.limit as number) || 10;
                const result = await pool.query(
                    "SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT $2",
                    [userId, limit]
                );
                return {
                    content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
                };
            }

            case "add_expense": {
                const { description, amount, category, note } = args as any;
                const result = await pool.query(
                    `INSERT INTO expenses (description, amount, category, note, user_id, date)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *`,
                    [description, amount, category || "other", note || null, userId]
                );
                return {
                    content: [{ type: "text", text: `Expense added: ${JSON.stringify(result.rows[0], null, 2)}` }],
                };
            }

            case "list_income": {
                const result = await pool.query(
                    "SELECT * FROM income_sources WHERE user_id = $1 ORDER BY created_at DESC",
                    [userId]
                );
                return {
                    content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
                };
            }

            case "add_income": {
                const { name: incomeName, amount, frequency, description } = args as any;
                const result = await pool.query(
                    `INSERT INTO income_sources (name, amount, frequency, description, user_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
                    [incomeName, amount, frequency || "monthly", description || null, userId]
                );
                return {
                    content: [{ type: "text", text: `Income added: ${JSON.stringify(result.rows[0], null, 2)}` }],
                };
            }

            case "get_budget_summary": {
                // Get total income (monthly estimate)
                const incomeResult = await pool.query(
                    "SELECT SUM(amount) as total FROM income_sources WHERE user_id = $1",
                    [userId]
                );
                const totalIncome = parseFloat(incomeResult.rows[0].total || "0");

                // Get total expenses for current month
                const expenseResult = await pool.query(
                    `SELECT SUM(amount) as total FROM expenses 
           WHERE user_id = $1 AND date >= date_trunc('month', now())`,
                    [userId]
                );
                const totalExpenses = parseFloat(expenseResult.rows[0].total || "0");

                const summary = {
                    monthly_income: totalIncome,
                    expenses_this_month: totalExpenses,
                    balance: totalIncome - totalExpenses,
                    currency: "USD" // Defaulting to USD, could be configurable
                };

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

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Budget Track MCP server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
