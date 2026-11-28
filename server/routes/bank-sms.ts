import { RequestHandler } from "express";
import { pool } from "../db";
import { User } from "../../shared/api";
import { getPiranavUserId } from "./expenses";
import { parseBankSMS, ParsedBankSMS } from "../services/bank-sms-parser";
import {
  buildCategoryInlineKeyboard,
  sendTelegramPrompt,
  editTelegramMessage,
  answerTelegramCallbackQuery,
} from "../services/telegram";

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
      source: bodySource,
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

    const effectiveChatId = chat_id || chatId || process.env.TELEGRAM_CHAT_ID || null;
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

    // 3. Contact Memory & Learned Merchant Rules Check
    let effectiveCategory = parsed.category || "other";
    let learnedNote: string | null = null;
    let isLearnedMerchant = false;

    if (parsed.merchant && parsed.merchant !== "Card / UPI Transaction") {
      try {
        const ruleRes = await pool.query(
          `SELECT category, note FROM merchant_rules
           WHERE user_id = $1 AND (
             $2 ILIKE '%' || merchant_keyword || '%' OR
             merchant_keyword ILIKE '%' || $2 || '%'
           )
           ORDER BY LENGTH(merchant_keyword) DESC
           LIMIT 1`,
          [targetUserId, parsed.merchant.trim()]
        );
        if (ruleRes.rows.length > 0) {
          effectiveCategory = ruleRes.rows[0].category;
          learnedNote = ruleRes.rows[0].note;
          isLearnedMerchant = true;
          parsed.confidence = "learned_rule" as any;
        }
      } catch (e) {
        console.warn("Could not query merchant_rules:", e);
      }
    }

    // 4. Record Expense or Income
    let recordedRecord: any = null;
    let responseType: "expense" | "income" = "expense";
    const ledgerSource = matchedAccount ? matchedAccount.name : (bodySource || "Current Bank Account");

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
          effectiveCategory,
          parsed.merchant || "Bank Debit",
          ledgerSource,
          learnedNote || `Auto-logged from Bank SMS: ${rawInput.substring(0, 150)}`,
          parsed.confidence,
          effectiveChatId ? String(effectiveChatId) : null,
        ]
      );
      recordedRecord = expRes.rows[0];
    }

    // 5. Determine if we need Telegram 1-Tap Category Prompt (for individual names / ambiguous vendors)
    const requiresClarification = responseType === "expense" && !isLearnedMerchant && (effectiveCategory === "other" || parsed.confidence === "fallback" || parsed.amount === 50);

    const inlineKeyboard = recordedRecord && requiresClarification
      ? buildCategoryInlineKeyboard(recordedRecord.id, parsed.merchant, parsed.amount)
      : undefined;

    const telegramPromptText = `🔔 *New UPI Payment: ₹${parsed.amount.toLocaleString()} to ${parsed.merchant}*\n` +
      `🏦 *Account:* ${ledgerSource}\n` +
      `${newBalance !== null ? `💵 *Updated Balance:* ₹${newBalance.toLocaleString()}\n` : ""}` +
      `\n*Quick Select Category (1-Tap):*`;

    // Send direct Telegram prompt if chat_id and BOT_TOKEN are available
    if (effectiveChatId && inlineKeyboard) {
      await sendTelegramPrompt(effectiveChatId, telegramPromptText, inlineKeyboard);
    }

    // Standard summary text reply
    const formattedReply = responseType === "income"
      ? `💰 *Income Credited!*\n• *Amount:* ₹${parsed.amount.toLocaleString()}\n• *Source:* ${parsed.merchant}\n• *Bank:* ${ledgerSource}${newBalance !== null ? `\n• *New Balance:* ₹${newBalance.toLocaleString()}` : ""}`
      : `💸 *Expense Logged!*\n• *Amount:* ₹${parsed.amount.toLocaleString()}\n• *Merchant:* ${parsed.merchant}\n• *Category:* ${effectiveCategory}\n• *Account:* ${ledgerSource}${newBalance !== null ? `\n• *New Balance:* ₹${newBalance.toLocaleString()}` : ""}`;

    return res.status(200).json({
      success: true,
      transaction_type: responseType,
      parsed: {
        ...parsed,
        category: effectiveCategory,
      },
      record: recordedRecord,
      matched_account: matchedAccount ? {
        id: matchedAccount.id,
        name: matchedAccount.name,
        bank_name: matchedAccount.bank_name,
        balance: newBalance !== null ? newBalance : matchedAccount.balance,
      } : null,
      requires_clarification: requiresClarification,
      telegram_prompt: requiresClarification ? {
        text: telegramPromptText,
        reply_markup: inlineKeyboard,
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

/**
 * Handle Telegram Interactive Inline Button Tap (Callback Query)
 * POST /api/webhook/telegram/callback
 */
export const handleTelegramCallback: RequestHandler = async (req, res) => {
  try {
    const callbackQuery = req.body?.callback_query || req.body;
    const dataStr: string = callbackQuery?.data || req.body?.data || "";
    const callbackId: string = callbackQuery?.id || "";
    const chatId = callbackQuery?.message?.chat?.id || req.body?.chat_id;
    const messageId = callbackQuery?.message?.message_id || req.body?.message_id;

    if (!dataStr || !dataStr.startsWith("cat:")) {
      return res.status(400).json({ success: false, error: "Invalid callback data" });
    }

    // Format: cat:category:subType:expenseId (e.g. cat:food:office_tea:45)
    const parts = dataStr.split(":");
    const category = parts[1] || "other";
    const subType = parts[2] || "general";
    const expenseId = parseInt(parts[3], 10);

    if (isNaN(expenseId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid expense ID" });
    }

    let noteText = "";
    if (subType === "office_tea") {
      noteText = "Daily Corporate Spend (Office / Tea / Snacks)";
    } else if (subType === "meal") {
      noteText = "Food & Dining";
    } else if (subType === "auto") {
      noteText = "Travel & Auto / Fuel";
    } else if (subType === "store") {
      noteText = "Shopping & Grocery";
    } else if (subType === "split") {
      noteText = "Friend Split / Shared Expense";
    } else if (subType === "recharge") {
      noteText = "Utilities & Recharge";
    }

    // 1. Update the Expense record in PostgreSQL
    const updateRes = await pool.query(
      `UPDATE expenses 
       SET category = $1, note = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING id, amount, description, source, user_id`,
      [category, noteText, expenseId]
    );

    if (updateRes.rows.length === 0) {
      if (callbackId) await answerTelegramCallbackQuery(callbackId, "Expense not found");
      return res.status(404).json({ success: false, error: "Expense not found" });
    }

    const exp = updateRes.rows[0];

    // 2. Remember this Merchant for the future! (Contact / Merchant Learning)
    if (exp.description && exp.description !== "Bank Debit" && exp.description !== "Card / UPI Transaction") {
      try {
        await pool.query(
          `INSERT INTO merchant_rules (user_id, merchant_keyword, category, note)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, merchant_keyword) 
           DO UPDATE SET category = $3, note = $4, updated_at = NOW()`,
          [exp.user_id, exp.description.trim(), category, noteText]
        );
        console.log(`[Merchant Memory] Learned: "${exp.description}" ➔ ${category} (${noteText})`);
      } catch (err) {
        console.warn("Could not save merchant rule:", err);
      }
    }

    // 3. Acknowledge the Telegram Callback
    if (callbackId) {
      await answerTelegramCallbackQuery(callbackId, `Saved as ${category.toUpperCase()}!`);
    }

    // 4. Edit the Telegram message to show clean checkmark confirmation
    const updatedMessageText = `✅ *Payment Categorized!*\n` +
      `• *Recipient:* ${exp.description}\n` +
      `• *Amount:* ₹${Number(exp.amount).toLocaleString()}\n` +
      `• *Category:* ${category.toUpperCase()} (${noteText})\n` +
      `• *Account:* ${exp.source || "Current Bank Account"}\n\n` +
      `🧠 _SmartSpend learned this vendor! Future payments to "${exp.description}" will be auto-categorized._`;

    if (chatId && messageId) {
      await editTelegramMessage(chatId, messageId, updatedMessageText);
    }

    return res.status(200).json({
      success: true,
      expense_id: expenseId,
      category,
      note: noteText,
      merchant_learned: exp.description,
      confirmation_text: updatedMessageText,
    });
  } catch (error) {
    console.error("Telegram callback error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process Telegram callback",
    });
  }
};

/**
 * List all learned merchant rules
 * GET /api/merchant-rules
 */
export const handleListMerchantRules: RequestHandler = async (req, res) => {
  try {
    let targetUserId: number;
    if (req.isAuthenticated && req.isAuthenticated()) {
      targetUserId = (req.user as User).id;
    } else {
      targetUserId = await getPiranavUserId();
    }
    const result = await pool.query(
      `SELECT * FROM merchant_rules WHERE user_id = $1 ORDER BY updated_at DESC`,
      [targetUserId]
    );
    res.json({ success: true, rules: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch merchant rules" });
  }
};

/**
 * Delete a learned merchant rule
 * DELETE /api/merchant-rules/:id
 */
export const handleDeleteMerchantRule: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM merchant_rules WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete merchant rule" });
  }
};
