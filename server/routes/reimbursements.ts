import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";
import { getPiranavUserId } from "./expenses";

/**
 * List all corporate reimbursable expenses and summary analytics
 * GET /api/reimbursements
 */
export const handleListReimbursements: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { status } = req.query;

    let queryStr = `
      SELECT id, amount, category, description, date, note, source,
             is_reimbursable, reimbursement_status, claim_ref, receipt_url, corporate_project,
             created_at
      FROM expenses
      WHERE user_id = $1 AND is_reimbursable = true
    `;
    const params: any[] = [targetUserId];

    if (status && typeof status === "string" && status !== "all") {
      queryStr += " AND reimbursement_status = $2";
      params.push(status);
    }

    queryStr += " ORDER BY date DESC, id DESC";

    const result = await pool.query(queryStr, params);
    const items = result.rows.map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
    }));

    // Calculate metrics
    let pendingAmount = 0;
    let submittedAmount = 0;
    let approvedAmount = 0;
    let reimbursedAmount = 0;

    for (const item of items) {
      const st = (item.reimbursement_status || "pending").toLowerCase();
      if (st === "pending" || st === "none") {
        pendingAmount += item.amount;
      } else if (st === "submitted") {
        submittedAmount += item.amount;
      } else if (st === "approved") {
        approvedAmount += item.amount;
      } else if (st === "reimbursed") {
        reimbursedAmount += item.amount;
      }
    }

    const totalReimbursable = items.reduce((sum, item) => sum + item.amount, 0);

    return res.status(200).json({
      success: true,
      items,
      count: items.length,
      metrics: {
        totalReimbursable,
        pendingAmount,
        submittedAmount,
        approvedAmount,
        reimbursedAmount,
      },
    });
  } catch (error) {
    console.error("List reimbursements error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch corporate reimbursements",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Update claim status or details for a reimbursable expense
 * PATCH /api/reimbursements/:id
 */
export const handleUpdateReimbursement: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const { id } = req.params;
    const {
      is_reimbursable = true,
      reimbursement_status = "pending",
      claim_ref,
      receipt_url,
      corporate_project,
    } = req.body ?? {};

    const expenseCheck = await pool.query(
      "SELECT id FROM expenses WHERE id = $1 AND user_id = $2",
      [id, targetUserId]
    );

    if (expenseCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Expense not found" });
    }

    const updateRes = await pool.query(
      `UPDATE expenses
       SET is_reimbursable = $1,
           reimbursement_status = $2,
           claim_ref = COALESCE($3, claim_ref),
           receipt_url = COALESCE($4, receipt_url),
           corporate_project = COALESCE($5, corporate_project)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        Boolean(is_reimbursable),
        reimbursement_status,
        claim_ref || null,
        receipt_url || null,
        corporate_project || null,
        id,
        targetUserId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Corporate reimbursement status updated",
      expense: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Update reimbursement error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update reimbursement",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Export corporate reimbursements as CSV for HR/Finance claim upload
 * GET /api/reimbursements/export
 */
export const handleExportReimbursements: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const result = await pool.query(
      `SELECT id, date, description, amount, category, reimbursement_status, claim_ref, corporate_project, receipt_url
       FROM expenses
       WHERE user_id = $1 AND is_reimbursable = true
       ORDER BY date DESC`,
      [targetUserId]
    );

    const rows = result.rows;
    const header = ["Expense ID", "Date", "Description", "Amount (INR)", "Category", "Claim Status", "Claim Ref", "Project/Team", "Receipt URL"];
    const csvLines = [
      header.join(","),
      ...rows.map((r) => [
        r.id,
        `"${new Date(r.date).toLocaleDateString()}"`,
        `"${(r.description || "").replace(/"/g, '""')}"`,
        Number(r.amount || 0).toFixed(2),
        `"${r.category || ""}"`,
        `"${r.reimbursement_status || "pending"}"`,
        `"${r.claim_ref || ""}"`,
        `"${r.corporate_project || ""}"`,
        `"${r.receipt_url || ""}"`,
      ].join(",")),
    ];

    const csvContent = csvLines.join("\n");
    const filename = `corporate_reimbursements_${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export reimbursements error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to export reimbursements",
    });
  }
};
