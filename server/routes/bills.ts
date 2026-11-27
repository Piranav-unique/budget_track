import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";
import { getPiranavUserId } from "./expenses";

/**
 * Seeds default recurring bills for user if none exist
 */
export async function seedDefaultBillsForUser(userId: number) {
  try {
    const existing = await pool.query(
      "SELECT id FROM recurring_bills WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    if (existing.rows.length === 0) {
      console.log(`[Recurring Bills] Seeding default monthly bills for user ID: ${userId}...`);
      await pool.query(`
        INSERT INTO recurring_bills (user_id, name, amount, category, due_day, account_name, notes)
        VALUES
          ($1, 'AIC Cloud VPS Server', 99.00, 'utilities', 1, 'Current Bank Account', 'Ubuntu VPS hosting budget-track & n8n'),
          ($1, 'Airtel / Jio Mobile Recharge', 299.00, 'utilities', 5, 'Current Bank Account', 'Monthly 5G data and calling pack'),
          ($1, 'High-Speed Wi-Fi / Broadband', 799.00, 'utilities', 10, 'Current Bank Account', 'Home / Office internet connection'),
          ($1, 'Office Commute / Metro Pass', 1200.00, 'transport', 1, 'Current Bank Account', 'Monthly corporate travel & transit')
      `, [userId]);
      console.log(`[Recurring Bills] Successfully seeded default bills for user ${userId}.`);
    }
  } catch (err) {
    console.error("Error seeding default recurring bills:", err);
  }
}

/**
 * List all recurring bills with payment status and due calculations
 */
export const handleListBills: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    await seedDefaultBillsForUser(targetUserId);

    const result = await pool.query(
      `SELECT * FROM recurring_bills 
       WHERE user_id = $1 
       ORDER BY due_day ASC, id ASC`,
      [targetUserId]
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const bills = result.rows.map((row) => {
      const amount = Number(row.amount || 0);
      const dueDay = Number(row.due_day || 1);

      // Check if paid in the current month
      let isPaidThisMonth = false;
      if (row.last_paid_date) {
        const paidDate = new Date(row.last_paid_date);
        isPaidThisMonth =
          paidDate.getFullYear() === currentYear &&
          paidDate.getMonth() === currentMonth;
      }

      // Calculate days until next due
      let daysUntilDue = dueDay - currentDay;
      let nextDueYear = currentYear;
      let nextDueMonth = currentMonth;

      if (isPaidThisMonth || daysUntilDue < 0) {
        // Next due is next month
        nextDueMonth = currentMonth + 1;
        if (nextDueMonth > 11) {
          nextDueMonth = 0;
          nextDueYear = currentYear + 1;
        }
      }

      const nextDueDate = new Date(nextDueYear, nextDueMonth, dueDay);
      const diffTime = nextDueDate.getTime() - now.getTime();
      const calculatedDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...row,
        amount,
        is_paid_this_month: isPaidThisMonth,
        days_until_due: isPaidThisMonth ? calculatedDaysRemaining : daysUntilDue,
        next_due_date: nextDueDate.toISOString(),
      };
    });

    const totalMonthlyCommitment = bills.reduce((sum, b) => sum + b.amount, 0);
    const totalPaidThisMonth = bills
      .filter((b) => b.is_paid_this_month)
      .reduce((sum, b) => sum + b.amount, 0);
    const totalPendingThisMonth = totalMonthlyCommitment - totalPaidThisMonth;

    return res.status(200).json({
      success: true,
      bills,
      totalMonthlyCommitment,
      totalPaidThisMonth,
      totalPendingThisMonth,
    });
  } catch (error) {
    console.error("List bills error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch recurring bills",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Create a new recurring bill
 */
export const handleCreateBill: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const {
      name,
      amount,
      category = "utilities",
      due_day = 1,
      account_name = "Current Bank Account",
      notes = "",
    } = req.body ?? {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Bill name is required" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    const parsedDueDay = Math.min(31, Math.max(1, Number(due_day) || 1));

    const result = await pool.query(
      `INSERT INTO recurring_bills (
        user_id, name, amount, category, due_day, account_name, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        targetUserId,
        name.trim(),
        parsedAmount,
        category,
        parsedDueDay,
        account_name || "Current Bank Account",
        notes?.trim() || null,
      ]
    );

    return res.status(201).json({
      success: true,
      bill: {
        ...result.rows[0],
        amount: Number(result.rows[0].amount),
      },
    });
  } catch (error) {
    console.error("Create bill error:", error);
    return res.status(500).json({ error: "Failed to create recurring bill" });
  }
};

/**
 * Update an existing recurring bill
 */
export const handleUpdateBill: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { id } = req.params;
    const { name, amount, category, due_day, account_name, notes } = req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: "Bill ID is required" });
    }

    const result = await pool.query(
      `UPDATE recurring_bills
       SET name = COALESCE($1, name),
           amount = COALESCE($2, amount),
           category = COALESCE($3, category),
           due_day = COALESCE($4, due_day),
           account_name = COALESCE($5, account_name),
           notes = COALESCE($6, notes),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        name ? name.trim() : null,
        amount !== undefined ? Number(amount) : null,
        category || null,
        due_day !== undefined ? Number(due_day) : null,
        account_name || null,
        notes !== undefined ? notes : null,
        id,
        targetUserId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bill not found" });
    }

    return res.status(200).json({
      success: true,
      bill: {
        ...result.rows[0],
        amount: Number(result.rows[0].amount),
      },
    });
  } catch (error) {
    console.error("Update bill error:", error);
    return res.status(500).json({ error: "Failed to update bill" });
  }
};

/**
 * Delete a recurring bill
 */
export const handleDeleteBill: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM recurring_bills WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bill not found" });
    }

    return res.status(200).json({ success: true, message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Delete bill error:", error);
    return res.status(500).json({ error: "Failed to delete bill" });
  }
};

/**
 * Pay a bill: marks as paid this month, logs an expense, and deducts from bank account
 */
export const handlePayBill: RequestHandler = async (req, res) => {
  const client = await pool.connect();
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { id } = req.params;
    const { account_name } = req.body ?? {};

    // 1. Fetch bill
    const billRes = await client.query(
      "SELECT * FROM recurring_bills WHERE id = $1 AND user_id = $2",
      [id, targetUserId]
    );

    if (billRes.rows.length === 0) {
      return res.status(404).json({ error: "Bill not found" });
    }

    const bill = billRes.rows[0];
    const amount = Number(bill.amount);
    const effectiveAccount = account_name || bill.account_name || "Current Bank Account";

    await client.query("BEGIN");

    // 2. Update bill last_paid_date
    await client.query(
      "UPDATE recurring_bills SET last_paid_date = NOW(), updated_at = NOW() WHERE id = $1",
      [id]
    );

    // 3. Insert into expenses table
    const expenseRes = await client.query(
      `INSERT INTO expenses (
        user_id, description, amount, category, date, source, note, confidence, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, 'bill_payment', NOW())
      RETURNING *`,
      [
        targetUserId,
        `Recurring Bill: ${bill.name}`,
        amount,
        bill.category || "utilities",
        effectiveAccount,
        `Monthly payment logged for ${bill.name}`,
      ]
    );

    // 4. Auto-deduct from matching bank account balance
    await client.query(
      `UPDATE bank_accounts
       SET balance = balance - $1, updated_at = NOW()
       WHERE user_id = $2 AND (
         LOWER(name) = LOWER($3) OR 
         (LOWER($3) LIKE '%current%' AND LOWER(type) = 'current') OR
         (LOWER($3) LIKE '%saving%' AND LOWER(type) = 'savings') OR
         (LOWER($3) LIKE '%upi%' AND LOWER(type) = 'upi')
       )`,
      [amount, targetUserId, effectiveAccount]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Paid ₹${amount.toLocaleString()} for "${bill.name}" from ${effectiveAccount}. Recorded to expenses!`,
      expense: expenseRes.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Pay bill error:", error);
    return res.status(500).json({
      error: "Failed to process bill payment",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};
