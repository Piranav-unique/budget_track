import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";

export const handleCreateExpense: RequestHandler = async (req, res) => {
  try {
    // Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as User;
    const { description, amount, category, date, note } = req.body ?? {};

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

    const result = await pool.query(
      `INSERT INTO expenses (
        description, amount, category, date, note, user_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        description,
        parsedAmount,
        category || "other",
        parsedDate.toISOString(),
        note || null,
        user.id, // Use authenticated user's ID
        new Date().toISOString()
      ]
    );

    const expense = result.rows[0];

    // Notify n8n workflow (optional integration)
    try {
      const webhookUrl = process.env.N8N_EXPENSE_WEBHOOK_URL;
      if (webhookUrl) {
        console.log("Calling n8n webhook:", webhookUrl);
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            amount: parsedAmount,
            category: category || "other",
            date: parsedDate.toISOString(),
            note: note || null,
          }),
        });
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

    return res.status(201).json(expense);
  } catch (error) {
    console.error("Create expense error:", error);
    return res.status(500).json({ error: "Failed to create expense" });
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
    const { description, amount, category, date, note } = req.body ?? {};

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
       SET description = $1, amount = $2, category = $3, date = $4, note = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        description,
        parsedAmount,
        category || "other",
        parsedDate.toISOString(),
        note || null,
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

    return res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return res.status(500).json({ error: "Failed to delete expense" });
  }
};

