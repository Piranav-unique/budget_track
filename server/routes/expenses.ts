import { RequestHandler } from "express";
import { pool } from "../db";

export const handleCreateExpense: RequestHandler = async (req, res) => {
  try {
    const { description, amount, category, date, note, userId } = req.body ?? {};

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
        userId ?? null,
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

export const handleListExpenses: RequestHandler = async (_req, res) => {
  try {
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

    console.log("Fetching expenses from database...");
    const result = await pool.query(
      "SELECT * FROM expenses ORDER BY date DESC LIMIT 200"
    );
    console.log(`Successfully fetched ${result.rows.length} expenses.`);
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

