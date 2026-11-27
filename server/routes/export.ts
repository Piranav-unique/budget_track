import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";
import { getPiranavUserId } from "./expenses";

/**
 * Export expenses & income as a complete CSV ledger
 * GET /api/export/csv
 */
export const handleExportCSV: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { type = "all" } = req.query;

    const csvLines: string[] = [];

    if (type === "all" || type === "expenses") {
      const expRes = await pool.query(
        `SELECT id, date, description, amount, category, source, note, is_reimbursable, reimbursement_status
         FROM expenses
         WHERE user_id = $1
         ORDER BY date DESC`,
        [targetUserId]
      );

      csvLines.push("--- EXPENSES LEDGER ---");
      csvLines.push(["ID", "Type", "Date", "Description", "Amount (INR)", "Category", "Source", "Reimbursable", "Claim Status", "Note"].join(","));
      for (const r of expRes.rows) {
        csvLines.push([
          r.id,
          "Expense",
          `"${new Date(r.date).toISOString().split("T")[0]}"`,
          `"${(r.description || "").replace(/"/g, '""')}"`,
          Number(r.amount || 0).toFixed(2),
          `"${r.category || ""}"`,
          `"${r.source || ""}"`,
          r.is_reimbursable ? "Yes" : "No",
          `"${r.reimbursement_status || "none"}"`,
          `"${(r.note || "").replace(/"/g, '""')}"`,
        ].join(","));
      }
    }

    if (type === "all" || type === "income") {
      if (csvLines.length > 0) csvLines.push(""); // empty separator
      const incRes = await pool.query(
        `SELECT id, name, amount, frequency, description, created_at
         FROM income_sources
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [targetUserId]
      );

      csvLines.push("--- INCOME LEDGER ---");
      csvLines.push(["ID", "Type", "Date", "Source Name", "Amount (INR)", "Frequency", "Description"].join(","));
      for (const r of incRes.rows) {
        csvLines.push([
          r.id,
          "Income",
          `"${new Date(r.created_at).toISOString().split("T")[0]}"`,
          `"${(r.name || "").replace(/"/g, '""')}"`,
          Number(r.amount || 0).toFixed(2),
          `"${r.frequency || ""}"`,
          `"${(r.description || "").replace(/"/g, '""')}"`,
        ].join(","));
      }
    }

    const filename = `smartspend_ledger_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csvLines.join("\n"));
  } catch (error) {
    console.error("Export CSV error:", error);
    return res.status(500).json({ success: false, error: "Failed to export CSV" });
  }
};

/**
 * Monthly Financial Summary Report
 * GET /api/export/summary
 */
export const handleExportFinancialSummary: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // 1. Month's expenses
    const expRes = await pool.query(
      `SELECT category, SUM(amount) as cat_total, COUNT(*) as count
       FROM expenses
       WHERE user_id = $1 AND date >= $2 AND date <= $3
       GROUP BY category
       ORDER BY cat_total DESC`,
      [targetUserId, startOfMonth, endOfMonth]
    );

    const categoryBreakdown = expRes.rows.map((r) => ({
      category: r.category,
      total: Number(r.cat_total || 0),
      count: Number(r.count || 0),
    }));

    const totalSpent = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);

    // 2. Month's income
    const incRes = await pool.query(
      `SELECT SUM(amount) as total_income, COUNT(*) as count
       FROM income_sources
       WHERE user_id = $1`,
      [targetUserId]
    );
    const totalIncome = Number(incRes.rows[0]?.total_income || 0);

    // 3. User budget
    const budRes = await pool.query(
      "SELECT monthly_limit, savings_goal FROM budgets WHERE user_id = $1 LIMIT 1",
      [targetUserId]
    );
    const monthlyLimit = Number(budRes.rows[0]?.monthly_limit || 0);
    const savingsGoal = Number(budRes.rows[0]?.savings_goal || 0);

    // 4. Bank account totals
    const accRes = await pool.query(
      "SELECT name, type, bank_name, balance FROM bank_accounts WHERE user_id = $1 ORDER BY is_primary DESC, balance DESC",
      [targetUserId]
    );
    const accounts = accRes.rows.map((a) => ({
      name: a.name,
      type: a.type,
      bank: a.bank_name,
      balance: Number(a.balance || 0),
    }));
    const totalLiquidBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    const netSavings = totalIncome > 0 ? totalIncome - totalSpent : 0;
    const budgetUtilizationPct = monthlyLimit > 0 ? (totalSpent / monthlyLimit) * 100 : 0;

    return res.status(200).json({
      success: true,
      report_period: {
        month: now.toLocaleString("default", { month: "long" }),
        year: now.getFullYear(),
      },
      metrics: {
        totalSpent,
        totalIncome,
        netSavings,
        monthlyLimit,
        savingsGoal,
        budgetUtilizationPct: Math.round(budgetUtilizationPct * 10) / 10,
        totalLiquidBalance,
      },
      categoryBreakdown,
      accounts,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Financial summary error:", error);
    return res.status(500).json({ success: false, error: "Failed to generate financial summary" });
  }
};
