import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";
import { getPiranavUserId } from "./expenses";
import { parseBankSMS, ParsedBankSMS } from "../services/bank-sms-parser";

/**
 * Handle incoming Bank SMS forwarded via Telegram, n8n, or Android SMS Forwarder
 * POST /api/webhook/bank-sms
 */
export const handleBankSMSWebhook: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }

    const {
      raw_sms,
      message,
      text,
      sms,
      body,
      chat_id,
      chatId,
      source = "bank-sms"
    } = req.body ?? {};

    const rawInput = raw_sms || message || text || sms || body;
    if (!rawInput || typeof rawInput !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing SMS text. Please provide 'raw_sms', 'message', or 'text' field.",
      });
    }

    // Parse the SMS using Regex + Groq AI
    const parsed: ParsedBankSMS | null = await parseBankSMS(rawInput);

    if (!parsed || !parsed.is_bank_sms || parsed.amount <= 0) {
      return res.status(200).json({
        success: false,
        message: "Message received but does not appear to be a financial bank transaction SMS.",
        raw_text: rawInput,
      });
    }

    const effectiveChatId = chat_id || chatId || null;
    let matchedAccount: any = null;

    // 1. Match or auto-register Bank Account
    if (parsed.account_last4 || parsed.bank_name) {
      let queryStr = "SELECT * FROM bank_accounts WHERE user_id = $1";
      const params: any[] = [targetUserId];

      if (parsed.account_last4) {
        queryStr += " AND (account_number ILIKE $2 OR name ILIKE $2)";
        params.push(`%${parsed.account_last4}%`);
      } else if (parsed.bank_name) {
        queryStr += " AND (bank_name ILIKE $2 OR name ILIKE $2)";
        params.push(`%${parsed.bank_name}%`);
      }

      queryStr += " LIMIT 1";
      const accRes = await pool.query(queryStr, params);

      if (accRes.rows.length > 0) {
        matchedAccount = accRes.rows[0];
      } else if (parsed.bank_name) {
        // Auto-create bank account if not exists
        const insertAccRes = await pool.query(
          `INSERT INTO bank_accounts (user_id, name, type, bank_name, account_number, balance, is_primary)
           VALUES ($1, $2, 'savings', $3, $4, $5, false)
           RETURNING *`,
          [
            targetUserId,
            `${parsed.bank_name} Account`,
            parsed.bank_name,
            parsed.account_last4 ? `•• ${parsed.account_last4}` : "Bank A/C",
            parsed.balance || 0,
          ]
        );
        matchedAccount = insertAccRes.rows[0];
      }
    }

    // 2. Update Bank Account Balance if balance was extracted or compute delta
    let newBalance: number | null = null;
    if (matchedAccount) {
      if (parsed.balance !== undefined && parsed.balance !== null) {
        newBalance = parsed.balance;
        await pool.query(
          "UPDATE bank_accounts SET balance = $1, updated_at = NOW() WHERE id = $2",
          [newBalance, matchedAccount.id]
        );
      } else {
        // Adjust balance based on debit/credit
        const currentBal = Number(matchedAccount.balance || 0);
        newBalance = parsed.type === "credit" ? currentBal + parsed.amount : currentBal - parsed.amount;
        await pool.query(
          "UPDATE bank_accounts SET balance = $1, updated_at = NOW() WHERE id = $2",
          [newBalance, matchedAccount.id]
        );
      }
    }

    // 3. Record Expense or Income
    let recordedRecord: any = null;
    let responseType: "expense" | "income" = "expense";

    if (parsed.type === "credit") {
      responseType = "income";
      const incRes = await pool.query(
        `INSERT INTO income_sources (user_id, name, amount, frequency, description, created_at, updated_at)
         VALUES ($1, $2, $3, 'one-time', $4, NOW(), NOW())
         RETURNING *`,
        [
          targetUserId,
          parsed.merchant || "Bank Credit / Salary",
          parsed.amount,
          `Bank SMS: ${parsed.bank_name || "Bank"} (A/C ${parsed.account_last4 || "N/A"}) - ${rawInput.substring(0, 100)}`
        ]
      );
      recordedRecord = incRes.rows[0];
    } else {
      // Debit -> Record Expense
      const expRes = await pool.query(
        `INSERT INTO expenses (
          user_id, amount, category, description, source, note, confidence, chat_id, date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
        [
          targetUserId,
          parsed.amount,
          parsed.category || "other",
          parsed.merchant || "Bank Debit",
          source,
          `Auto-logged from Bank SMS: ${rawInput.substring(0, 150)}`,
          parsed.confidence,
          effectiveChatId ? String(effectiveChatId) : null,
        ]
      );
      recordedRecord = expRes.rows[0];
    }

    // 4. Formatted summary message for Telegram bot reply
    const formattedReply = responseType === "income"
      ? `💰 *Income Credited!*\n• *Amount:* ₹${parsed.amount.toLocaleString()}\n• *Source:* ${parsed.merchant}\n• *Bank:* ${parsed.bank_name || "Bank"}${parsed.account_last4 ? ` (•• ${parsed.account_last4})` : ""}${newBalance !== null ? `\n• *New Balance:* ₹${newBalance.toLocaleString()}` : ""}`
      : `💸 *Expense Logged!*\n• *Amount:* ₹${parsed.amount.toLocaleString()}\n• *Merchant:* ${parsed.merchant}\n• *Category:* ${parsed.category}\n• *Bank:* ${parsed.bank_name || "Bank"}${parsed.account_last4 ? ` (•• ${parsed.account_last4})` : ""}${newBalance !== null ? `\n• *New Balance:* ₹${newBalance.toLocaleString()}` : ""}`;

    return res.status(200).json({
      success: true,
      transaction_type: responseType,
      parsed,
      record: recordedRecord,
      matched_account: matchedAccount ? {
        id: matchedAccount.id,
        name: matchedAccount.name,
        bank_name: matchedAccount.bank_name,
        balance: newBalance !== null ? newBalance : matchedAccount.balance,
      } : null,
      telegram_reply: formattedReply,
    });
  } catch (error) {
    console.error("Bank SMS webhook error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process bank SMS",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
