import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";
import { getPiranavUserId } from "./expenses";

/**
 * Auto-seeds starter accounts for new users or existing users with no accounts yet
 */
export async function seedDefaultAccountsForUser(userId: number) {
  try {
    const existing = await pool.query(
      "SELECT id FROM bank_accounts WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    if (existing.rows.length === 0) {
      console.log(`[Bank Accounts] Seeding default accounts for user ID: ${userId}...`);
      await pool.query(`
        INSERT INTO bank_accounts (user_id, name, type, bank_name, account_number, balance, is_primary, color)
        VALUES
          ($1, 'Current Bank Account', 'current', 'Corporate / Business', '•• 4819', 25000.00, true, 'blue'),
          ($1, 'Savings Bank Account', 'savings', 'State Bank of India', '•• 9021', 50000.00, false, 'emerald'),
          ($1, 'UPI Wallet', 'upi', 'GPay / PhonePe', 'UPI ID', 2000.00, false, 'purple'),
          ($1, 'Cash in Hand', 'cash', 'Physical Cash', 'Cash', 1000.00, false, 'amber')
      `, [userId]);
      console.log(`[Bank Accounts] Successfully seeded default accounts for user ${userId}.`);
    }
  } catch (err) {
    console.error("Error seeding default accounts:", err);
  }
}

/**
 * List all bank accounts for the authenticated user
 */
export const handleListAccounts: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;

    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    // Ensure user has default accounts
    await seedDefaultAccountsForUser(targetUserId);

    const result = await pool.query(
      `SELECT * FROM bank_accounts 
       WHERE user_id = $1 
       ORDER BY is_primary DESC, id ASC`,
      [targetUserId]
    );

    const accounts = result.rows.map((row) => ({
      ...row,
      balance: Number(row.balance || 0),
    }));

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return res.status(200).json({
      success: true,
      accounts,
      totalBalance,
      currency: "INR",
    });
  } catch (error) {
    console.error("List accounts error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch bank accounts",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Create a new bank account
 */
export const handleCreateAccount: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const {
      name,
      type = "current",
      bank_name = "Bank",
      account_number = "",
      balance = 0,
      color = "blue",
      is_primary = false,
    } = req.body ?? {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Account name is required" });
    }

    const parsedBalance = Number(balance);
    if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
      return res.status(400).json({ error: "Initial balance must be a non-negative number" });
    }

    // If marked as primary, reset any other primary account for this user
    if (is_primary) {
      await pool.query(
        "UPDATE bank_accounts SET is_primary = false WHERE user_id = $1",
        [targetUserId]
      );
    }

    const result = await pool.query(
      `INSERT INTO bank_accounts (
        user_id, name, type, bank_name, account_number, balance, is_primary, color, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        targetUserId,
        name.trim(),
        type,
        bank_name.trim(),
        account_number.trim(),
        parsedBalance,
        Boolean(is_primary),
        color,
      ]
    );

    return res.status(201).json({
      success: true,
      account: {
        ...result.rows[0],
        balance: Number(result.rows[0].balance),
      },
    });
  } catch (error) {
    console.error("Create account error:", error);
    return res.status(500).json({ error: "Failed to create bank account" });
  }
};

/**
 * Update an existing bank account
 */
export const handleUpdateAccount: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { id } = req.params;
    const { name, type, bank_name, account_number, balance, color, is_primary } = req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: "Account ID is required" });
    }

    if (is_primary) {
      await pool.query(
        "UPDATE bank_accounts SET is_primary = false WHERE user_id = $1 AND id != $2",
        [targetUserId, id]
      );
    }

    const result = await pool.query(
      `UPDATE bank_accounts
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           bank_name = COALESCE($3, bank_name),
           account_number = COALESCE($4, account_number),
           balance = COALESCE($5, balance),
           color = COALESCE($6, color),
           is_primary = COALESCE($7, is_primary),
           updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        name ? name.trim() : null,
        type || null,
        bank_name ? bank_name.trim() : null,
        account_number ? account_number.trim() : null,
        balance !== undefined ? Number(balance) : null,
        color || null,
        is_primary !== undefined ? Boolean(is_primary) : null,
        id,
        targetUserId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    return res.status(200).json({
      success: true,
      account: {
        ...result.rows[0],
        balance: Number(result.rows[0].balance),
      },
    });
  } catch (error) {
    console.error("Update account error:", error);
    return res.status(500).json({ error: "Failed to update account" });
  }
};

/**
 * Delete a bank account
 */
export const handleDeleteAccount: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found or access denied" });
    }

    return res.status(200).json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ error: "Failed to delete account" });
  }
};

/**
 * Transfer funds between two bank accounts (Atomic Transaction)
 */
export const handleTransferFunds: RequestHandler = async (req, res) => {
  const client = await pool.connect();
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { fromAccountId, toAccountId, amount, note } = req.body ?? {};

    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({ error: "Source and destination accounts are required" });
    }

    if (Number(fromAccountId) === Number(toAccountId)) {
      return res.status(400).json({ error: "Cannot transfer to the same account" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Transfer amount must be greater than 0" });
    }

    await client.query("BEGIN");

    // Check source account balance
    const fromCheck = await client.query(
      "SELECT id, name, balance FROM bank_accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [fromAccountId, targetUserId]
    );

    if (fromCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Source account not found" });
    }

    const sourceAccount = fromCheck.rows[0];
    const currentBalance = Number(sourceAccount.balance);

    if (currentBalance < parsedAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient balance in ${sourceAccount.name}. Current: ₹${currentBalance.toLocaleString()}, Needed: ₹${parsedAmount.toLocaleString()}`,
      });
    }

    // Check destination account
    const toCheck = await client.query(
      "SELECT id, name, balance FROM bank_accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [toAccountId, targetUserId]
    );

    if (toCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Destination account not found" });
    }

    // Deduct from source
    await client.query(
      "UPDATE bank_accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
      [parsedAmount, fromAccountId]
    );

    // Add to destination
    await client.query(
      "UPDATE bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
      [parsedAmount, toAccountId]
    );

    // Log the transfer
    const transferResult = await client.query(
      `INSERT INTO account_transfers (user_id, from_account_id, to_account_id, amount, note, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [targetUserId, fromAccountId, toAccountId, parsedAmount, note || "Inter-account transfer"]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Successfully transferred ₹${parsedAmount.toLocaleString()} from ${sourceAccount.name} to ${toCheck.rows[0].name}`,
      transfer: transferResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transfer error:", error);
    return res.status(500).json({
      error: "Failed to complete transfer",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};

/**
 * List recent account transfers
 */
export const handleListTransfers: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const result = await pool.query(
      `SELECT t.*, 
              f.name as from_account_name, f.bank_name as from_bank,
              dest.name as to_account_name, dest.bank_name as to_bank
       FROM account_transfers t
       JOIN bank_accounts f ON t.from_account_id = f.id
       JOIN bank_accounts dest ON t.to_account_id = dest.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [targetUserId]
    );

    return res.status(200).json({
      success: true,
      transfers: result.rows,
    });
  } catch (error) {
    console.error("List transfers error:", error);
    return res.status(500).json({ error: "Failed to fetch transfers" });
  }
};
