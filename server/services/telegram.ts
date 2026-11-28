/**
 * Telegram Bot Service for SmartSpend Flow
 * Sends interactive messages with 1-tap category selection buttons
 */

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export function buildCategoryInlineKeyboard(expenseId: number, merchant: string, amount: number): InlineKeyboardMarkup {
  const is50 = amount === 50;

  return {
    inline_keyboard: [
      [
        {
          text: is50 ? "☕ Office Tea (₹50)" : "☕ Tea & Snacks",
          callback_data: `cat:food:office_tea:${expenseId}`,
        },
        {
          text: "🍔 Food & Dining",
          callback_data: `cat:food:meal:${expenseId}`,
        },
      ],
      [
        {
          text: "🚗 Travel & Auto",
          callback_data: `cat:transport:auto:${expenseId}`,
        },
        {
          text: "🛍️ Shopping & Grocery",
          callback_data: `cat:shopping:store:${expenseId}`,
        },
      ],
      [
        {
          text: "🤝 Friend Split / Owed",
          callback_data: `cat:other:split:${expenseId}`,
        },
        {
          text: "⚡ Utilities / Recharge",
          callback_data: `cat:utilities:recharge:${expenseId}`,
        },
      ],
    ],
  };
}

/**
 * Send interactive message to Telegram with 1-tap category buttons
 */
export async function sendTelegramPrompt(
  chatId: string | number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<any> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId) {
    return null;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: replyMarkup,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.warn("[Telegram] Failed to send prompt message:", errData);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.warn("[Telegram] Error sending interactive prompt:", err);
    return null;
  }
}

/**
 * Edit existing Telegram message after user taps a category button
 */
export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text: string
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId || !messageId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "Markdown",
      }),
    });

    return response.ok;
  } catch (err) {
    console.warn("[Telegram] Error editing message:", err);
    return false;
  }
}

/**
 * Answer Telegram callback query to dismiss loading clock icon
 */
export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !callbackQueryId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "Category updated!",
        show_alert: false,
      }),
    });

    return true;
  } catch (err) {
    return false;
  }
}
