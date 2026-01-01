import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";

export const handleCreateIncome: RequestHandler = async (req, res) => {
  try {
    // Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as User;
    const { name, amount, frequency, description } = req.body ?? {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const validFrequencies = ['monthly', 'weekly', 'bi-weekly', 'yearly'];
    if (!frequency || !validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: "frequency must be one of: monthly, weekly, bi-weekly, yearly" });
    }

    const result = await pool.query(
      `INSERT INTO income_sources (
        name, amount, frequency, description, user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name,
        parsedAmount,
        frequency,
        description || null,
        user.id, // Use authenticated user's ID
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    const income = result.rows[0];
    return res.status(201).json(income);
  } catch (error) {
    console.error("Create income error:", error);
    return res.status(500).json({ error: "Failed to create income source" });
  }
};

export const handleListIncome: RequestHandler = async (req, res) => {
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

    console.log(`Fetching income sources for user ${user.id} from database...`);
    const result = await pool.query(
      "SELECT * FROM income_sources WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id]
    );
    console.log(`Successfully fetched ${result.rows.length} income sources for user ${user.id}.`);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("List income error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      dbUrl: process.env.DATABASE_URL ? "Present (masked)" : "MISSING"
    });
    return res.status(500).json({
      error: "Failed to load income sources",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const handleUpdateIncome: RequestHandler = async (req, res) => {
  try {
    // Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as User;
    const { id } = req.params;
    const { name, amount, frequency, description } = req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: "income id is required" });
    }

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const validFrequencies = ['monthly', 'weekly', 'bi-weekly', 'yearly'];
    if (!frequency || !validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: "frequency must be one of: monthly, weekly, bi-weekly, yearly" });
    }

    // Update income source only if it belongs to the authenticated user
    const result = await pool.query(
      `UPDATE income_sources 
       SET name = $1, amount = $2, frequency = $3, description = $4, updated_at = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        name,
        parsedAmount,
        frequency,
        description || null,
        new Date().toISOString(),
        id,
        user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Income source not found or access denied" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Update income error:", error);
    return res.status(500).json({ error: "Failed to update income source" });
  }
};

export const handleDeleteIncome: RequestHandler = async (req, res) => {
  try {
    // Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as User;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "income id is required" });
    }

    // Delete income source only if it belongs to the authenticated user
    const result = await pool.query(
      "DELETE FROM income_sources WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Income source not found or access denied" });
    }

    return res.status(200).json({ message: "Income source deleted successfully" });
  } catch (error) {
    console.error("Delete income error:", error);
    return res.status(500).json({ error: "Failed to delete income source" });
  }
};

