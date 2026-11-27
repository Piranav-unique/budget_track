import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";
import { categorizeWithAI, isGroqAvailable } from "../services/groq";
import { handleBankSMSWebhook } from "./bank-sms";

/**
 * Find or auto-create the user 'piranav' to associate Telegram / n8n expenses with.
 */
export async function getPiranavUserId(): Promise<number> {
  try {
    // 1. Look for user matching 'piranav' by username, display_name, or email
    const result = await pool.query(
      `SELECT id FROM users 
       WHERE LOWER(username) = 'piranav' 
          OR LOWER(display_name) = 'piranav' 
          OR LOWER(email) LIKE '%piranav%' 
       ORDER BY id ASC LIMIT 1`
    );
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // 2. Fallback to the first existing user in the database
    const anyUser = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    if (anyUser.rows.length > 0) {
      return anyUser.rows[0].id;
    }

    // 3. If no users exist at all, auto-create the Piranav user
    const newUser = await pool.query(
      `INSERT INTO users (username, password, display_name, email)
       VALUES ('piranav', 'system_generated', 'Piranav', 'piranav.richu2006@gmail.com')
       RETURNING id`
    );
    console.log(`[Users] Created default 'piranav' account with ID ${newUser.rows[0].id}`);
    return newUser.rows[0].id;
  } catch (error) {
    console.error("Error resolving Piranav user ID:", error);
    return 1;
  }
}

export const handleCreateExpense: RequestHandler = async (req, res) => {
  try {
    const {
      description,
      amount,
      category,
      date,
      note,
      chat_id,
      chatId,
      source,
      userId
    } = req.body ?? {};

    const isAuthenticated = typeof req.isAuthenticated === "function" && req.isAuthenticated();

    // Check if the request originates from Telegram, n8n, or an external bot/webhook
    const isTelegramOrN8n =
      source === "telegram" ||
      source === "n8n" ||
      Boolean(chat_id || chatId) ||
      req.headers["x-source"] === "telegram" ||
      req.headers["x-source"] === "n8n" ||
      req.query.source === "telegram" ||
      req.query.source === "n8n" ||
      (req.headers["x-webhook-secret"] &&
        (req.headers["x-webhook-secret"] === process.env.N8N_WEBHOOK_SECRET ||
         req.headers["x-webhook-secret"] === process.env.TELEGRAM_WEBHOOK_SECRET));

    if (!isAuthenticated && !isTelegramOrN8n && !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Determine target user ID
    let targetUserId: number;
    if (isAuthenticated) {
      targetUserId = (req.user as User).id;
    } else if (isTelegramOrN8n) {
      // Wire directly to user 'piranav'
      targetUserId = await getPiranavUserId();
      console.log(`[Telegram/n8n Expense] Routed to user 'piranav' (ID: ${targetUserId})`);
    } else if (userId) {
      targetUserId = Number(userId);
    } else {
      targetUserId = await getPiranavUserId();
    }

    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "description is required" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const parsedDate = date ? new Date(date) : new Date();
    const effectiveDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    // Auto-categorize using Groq AI if category is missing or set to 'other'
    let resolvedCategory = category;
    let confidence = "manual";
    if (!resolvedCategory || resolvedCategory === "other") {
      try {
        if (await isGroqAvailable()) {
          resolvedCategory = await categorizeWithAI(description);
          confidence = "ai";
        } else {
          resolvedCategory = "other";
        }
      } catch (err) {
        resolvedCategory = "other";
      }
    }

    const effectiveChatId = chat_id || chatId || null;
    const effectiveSource = source || (isTelegramOrN8n ? "telegram" : "Current Bank Account");

    const result = await pool.query(
      `INSERT INTO expenses (
        description, amount, category, date, note, user_id, chat_id, source, confidence, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        description,
        parsedAmount,
        resolvedCategory,
        effectiveDate.toISOString(),
        note || null,
        targetUserId,
        effectiveChatId ? String(effectiveChatId) : null,
        effectiveSource,
        confidence,
        new Date().toISOString()
      ]
    );

    const expense = result.rows[0];

    // Auto-deduct from matching bank account balance
    if (effectiveSource) {
      try {
        await pool.query(
          `UPDATE bank_accounts
           SET balance = balance - $1, updated_at = NOW()
           WHERE user_id = $2 AND (
             LOWER(name) = LOWER($3) OR 
             (LOWER($3) LIKE '%current%' AND LOWER(type) = 'current') OR
             (LOWER($3) LIKE '%saving%' AND LOWER(type) = 'savings') OR
             (LOWER($3) LIKE '%upi%' AND LOWER(type) = 'upi') OR
             (LOWER($3) LIKE '%cash%' AND LOWER(type) = 'cash')
           )`,
          [parsedAmount, targetUserId, effectiveSource]
        );
      } catch (err) {
        console.warn("Could not auto-deduct from bank account:", err);
      }
    }

    // Notify outbound n8n workflow only if this expense did NOT come from n8n/telegram
    if (!isTelegramOrN8n) {
      try {
        const webhookUrl = process.env.N8N_EXPENSE_WEBHOOK_URL;
        if (webhookUrl) {
          console.log("Calling n8n webhook:", webhookUrl);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              id: expense.id,
              description,
              amount: parsedAmount,
              category: resolvedCategory,
              date: effectiveDate.toISOString(),
              note: note || null,
              userId: targetUserId,
              source: effectiveSource
            }),
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            const text = await response.text().catch(() => "");
            console.warn(
              "n8n webhook error:",
              response.status,
              response.statusText,
              text,
            );
          }
        }
      } catch (webhookError) {
        console.warn("Failed to notify n8n webhook:", webhookError);
      }
    }

    return res.status(201).json(expense);
  } catch (error) {
    console.error("Create expense error:", error);
    return res.status(500).json({ error: "Failed to create expense" });
  }
};

/**
 * Dedicated Webhook handler for Telegram bots and n8n workflows.
 * POST /api/webhook/telegram or POST /api/webhook/n8n
 * Always assigns expenses directly to user 'piranav'.
 */
export const handleTelegramExpense: RequestHandler = async (req, res) => {
  try {
    const {
      description,
      amount,
      category,
      date,
      note,
      chat_id,
      chatId,
      source
    } = req.body ?? {};

    // Check optional webhook secret if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret =
        req.headers["x-webhook-secret"] ||
        req.headers["x-api-key"] ||
        req.query.secret;
      if (providedSecret !== webhookSecret) {
        return res.status(401).json({ error: "Invalid webhook secret" });
      }
    }

    // Auto-detect if this is a raw Bank SMS forwarded from Telegram / n8n
    const rawSmsCandidate = req.body?.raw_sms || req.body?.message || req.body?.text || (typeof description === "string" && !amount && description.length > 20 ? description : null);
    if (rawSmsCandidate && (!amount || isNaN(Number(amount)))) {
      return handleBankSMSWebhook(req, res, () => {});
    }

    if (!description || typeof description !== "string") {
      return res.status(400).json({
        error: "description is required (e.g. 'Coffee with friends' or 'Grocery')"
      });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const parsedDate = date ? new Date(date) : new Date();
    const effectiveDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    // All expenses from Telegram / n8n are wired directly to user 'piranav'
    const targetUserId = await getPiranavUserId();

    // Auto-categorize with AI if category is not provided or 'other'
    let resolvedCategory = category;
    let confidence = "manual";
    if (!resolvedCategory || resolvedCategory === "other") {
      try {
        if (await isGroqAvailable()) {
          resolvedCategory = await categorizeWithAI(description);
          confidence = "ai";
        } else {
          resolvedCategory = "other";
        }
      } catch (err) {
        resolvedCategory = "other";
      }
    }

    const effectiveChatId = chat_id || chatId || null;
    const effectiveSource = source || "telegram";

    const result = await pool.query(
      `INSERT INTO expenses (
        description, amount, category, date, note, user_id, chat_id, source, confidence, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        description,
        parsedAmount,
        resolvedCategory,
        effectiveDate.toISOString(),
        note || null,
        targetUserId,
        effectiveChatId ? String(effectiveChatId) : null,
        effectiveSource,
        confidence,
        new Date().toISOString()
      ]
    );

    const expense = result.rows[0];
    console.log(
      `✅ [Telegram Webhook] Expense added: ₹${parsedAmount} for "${description}" (${resolvedCategory}) to user Piranav (ID: ${targetUserId})`
    );

    return res.status(201).json({
      success: true,
      message: `Expense of ₹${parsedAmount} for "${description}" added to Piranav's account under "${resolvedCategory}".`,
      expense
    });
  } catch (error) {
    console.error("Telegram webhook expense error:", error);
    return res.status(500).json({
      error: "Failed to process Telegram expense",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const handleListExpenses: RequestHandler = async (req, res) => {
  try {
    // Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as User;

    // Check if database connection is available
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is missing");
      return res.status(500).json({
        error: "Database configuration missing",
        details: "DATABASE_URL environment variable is not set"
      });
    }

    // Test database connection
    try {
      await pool.query("SELECT 1");
    } catch (dbError) {
      console.error("Database connection test failed:", dbError);
      return res.status(500).json({
        error: "Database connection failed",
        details: dbError instanceof Error ? dbError.message : "Unknown database error"
      });
    }

    console.log(`Fetching expenses for user ${user.id} from database...`);
    const result = await pool.query(
      "SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT 200",
      [user.id]
    );
    console.log(`Successfully fetched ${result.rows.length} expenses for user ${user.id}.`);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("List expenses error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      dbUrl: process.env.DATABASE_URL ? "Present (masked)" : "MISSING"
    });
    return res.status(500).json({
      error: "Failed to load expenses",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const handleUpdateExpense: RequestHandler = async (req, res) => {
  try {
    // Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as User;
    const { id } = req.params;
    const { description, amount, category, date, note, source } = req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: "expense id is required" });
    }

    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "description is required" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const parsedDate = date ? new Date(date) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "date is invalid" });
    }

    // Update expense only if it belongs to the authenticated user
    const result = await pool.query(
      `UPDATE expenses 
       SET description = $1, amount = $2, category = $3, date = $4, note = $5, source = COALESCE($6, source)
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        description,
        parsedAmount,
        category || "other",
        parsedDate.toISOString(),
        note || null,
        source || null,
        id,
        user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found or access denied" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Update expense error:", error);
    return res.status(500).json({ error: "Failed to update expense" });
  }
};

export const handleDeleteExpense: RequestHandler = async (req, res) => {
  try {
    // Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as User;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "expense id is required" });
    }

    // Delete expense only if it belongs to the authenticated user
    const result = await pool.query(
      "DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expense not found or access denied" });
    }

    const deleted = result.rows[0];
    if (deleted && deleted.source) {
      try {
        await pool.query(
          `UPDATE bank_accounts
           SET balance = balance + $1, updated_at = NOW()
           WHERE user_id = $2 AND (
             LOWER(name) = LOWER($3) OR 
             (LOWER($3) LIKE '%current%' AND LOWER(type) = 'current') OR
             (LOWER($3) LIKE '%saving%' AND LOWER(type) = 'savings') OR
             (LOWER($3) LIKE '%upi%' AND LOWER(type) = 'upi') OR
             (LOWER($3) LIKE '%cash%' AND LOWER(type) = 'cash')
           )`,
          [Number(deleted.amount), user.id, deleted.source]
        );
      } catch (err) {
        console.warn("Could not restore bank balance:", err);
      }
    }

    return res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return res.status(500).json({ error: "Failed to delete expense" });
  }
};
