import Groq from "groq-sdk";
import { getGroqApiKey } from "./groq";

export interface ParsedBankSMS {
  is_bank_sms: boolean;
  type: "debit" | "credit" | "unknown";
  amount: number;
  merchant: string;
  category: string;
  bank_name?: string;
  account_last4?: string;
  balance?: number;
  date?: string;
  raw_sms: string;
  confidence: "regex" | "ai" | "fallback";
}

/**
 * Common merchant to category mapping for fast regex categorization
 */
const MERCHANT_CATEGORIES: Record<string, string> = {
  swiggy: "food",
  zomato: "food",
  kfc: "food",
  mcdonalds: "food",
  starbucks: "food",
  dominos: "food",
  pizza: "food",
  uber: "transport",
  ola: "transport",
  rapido: "transport",
  petrol: "transport",
  fuel: "transport",
  irctc: "transport",
  amazon: "shopping",
  flipkart: "shopping",
  myntra: "shopping",
  nykaa: "shopping",
  blinkit: "food",
  zepto: "food",
  instamart: "food",
  bigbasket: "food",
  netflix: "entertainment",
  spotify: "entertainment",
  prime: "entertainment",
  hotstar: "entertainment",
  bookmyshow: "entertainment",
  pharmacy: "medical",
  apollo: "medical",
  medplus: "medical",
  hospital: "medical",
  bescom: "utilities",
  electricity: "utilities",
  airtel: "utilities",
  jio: "utilities",
  broadband: "utilities",
  recharge: "utilities",
  salary: "salary",
};

/**
 * Known Indian Bank names detection
 */
const BANK_PATTERNS = [
  { name: "HDFC Bank", regex: /\b(hdfc|hdfcbk)\b/i },
  { name: "State Bank of India", regex: /\b(sbi|sbinb|state bank)\b/i },
  { name: "ICICI Bank", regex: /\b(icici|icicib)\b/i },
  { name: "Axis Bank", regex: /\b(axis|axisbk)\b/i },
  { name: "Kotak Mahindra Bank", regex: /\b(kotak|kotakb)\b/i },
  { name: "Punjab National Bank", regex: /\b(pnb)\b/i },
  { name: "Bank of Baroda", regex: /\b(bob|baroda)\b/i },
  { name: "Canara Bank", regex: /\b(canara|canarabk)\b/i },
  { name: "IndusInd Bank", regex: /\b(indusind)\b/i },
  { name: "IDFC FIRST Bank", regex: /\b(idfc)\b/i },
  { name: "Paytm Payments Bank", regex: /\b(paytm)\b/i },
  { name: "Federal Bank", regex: /\b(federal)\b/i },
  { name: "Union Bank of India", regex: /\b(union bank)\b/i },
];

/**
 * Extract bank name from text
 */
function extractBankName(text: string): string | undefined {
  for (const b of BANK_PATTERNS) {
    if (b.regex.test(text)) {
      return b.name;
    }
  }
  return undefined;
}

/**
 * Fast Regex-based parsing of standard Indian Bank SMS
 */
export function parseBankSMSRegex(rawText: string): ParsedBankSMS | null {
  const text = rawText.trim();
  if (!text) return null;

  // Check if it's bank-related
  const isBankRelated = /\b(debited|credited|spent|sent|transferred|acct|a\/c|account|bal|balance|inr|rs\.?|upi|vpa)\b/i.test(text);
  if (!isBankRelated) {
    return null;
  }

  // Detect transaction type
  const isDebit = /\b(debited|spent|sent|withdrawn|paid|purchase|dr\.?)\b/i.test(text);
  const isCredit = /\b(credited|received|deposit|cr\.?|salary|refund)\b/i.test(text);

  let type: "debit" | "credit" | "unknown" = "unknown";
  if (isDebit && !isCredit) type = "debit";
  else if (isCredit && !isDebit) type = "credit";
  else if (isDebit) type = "debit"; // default if both matched e.g. "debited... if not you contact"

  // Extract Amount (e.g., INR 250.00, Rs. 1,500, Rs 500)
  const amountMatch = text.match(/(?:(?:INR|RS\.?|₹)\s*|credited\s+by\s*Rs\.?\s*|debited\s+by\s*Rs\.?\s*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i) ||
                      text.match(/([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:INR|RS\.?|₹)/i);

  if (!amountMatch) {
    return null; // Not an amount-bearing transaction SMS
  }

  const rawAmountStr = amountMatch[1].replace(/,/g, "");
  const amount = parseFloat(rawAmountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // Extract Account Last 4 digits (e.g. A/c **4819, Acct XX1234, ending 9021, card 5678)
  let account_last4: string | undefined;
  const acctMatch = text.match(/(?:a\/c|acct|account|card|ending)\s*(?:no\.?)?\s*(?:\*{2,}|X+|no\.)?\s*([0-9]{3,4})/i) ||
                    text.match(/[*X]{2,}([0-9]{3,4})/i);
  if (acctMatch) {
    account_last4 = acctMatch[1];
  }

  // Extract Available Balance (e.g., Avl Bal: INR 35,420.50, Bal Rs 12,300, Available Balance is Rs 5000)
  let balance: number | undefined;
  const balMatch = text.match(/(?:avl\s*bal|avail(?:able)?\s*bal(?:ance)?|total\s*bal(?:ance)?|bal(?:ance)?(?:\s*is)?)\s*(?::|\s)\s*(?:INR|RS\.?|₹)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i);
  if (balMatch) {
    const balVal = parseFloat(balMatch[1].replace(/,/g, ""));
    if (!isNaN(balVal)) {
      balance = balVal;
    }
  }

  // Extract Merchant / Beneficiary
  let merchant = "";
  const toMatch = text.match(/(?:at|to|towards|vpa|info:?)\s+([A-Za-z0-9\s._&-]{2,30}?)(?:\s+(?:on|ref|upi|avl|bal|val|via|\.)|$)/i);
  if (toMatch) {
    merchant = toMatch[1].trim();
  }

  if (!merchant) {
    if (type === "credit") {
      merchant = text.toLowerCase().includes("salary") ? "Salary" : "Bank Credit / Deposit";
    } else {
      merchant = "Card / UPI Transaction";
    }
  }

  // Fast categorize
  let category = "other";
  const lowerMerchant = merchant.toLowerCase();
  for (const [kw, cat] of Object.entries(MERCHANT_CATEGORIES)) {
    if (lowerMerchant.includes(kw) || text.toLowerCase().includes(kw)) {
      category = cat;
      break;
    }
  }
  if (type === "credit" && category === "other") {
    category = "income";
  }

  const bank_name = extractBankName(text);

  return {
    is_bank_sms: true,
    type,
    amount,
    merchant,
    category,
    bank_name,
    account_last4,
    balance,
    raw_sms: text,
    confidence: "regex",
  };
}

/**
 * AI-assisted SMS parser using Groq AI (Llama 3.3) for ambiguous or complex SMS
 */
export async function parseBankSMSWithAI(rawText: string): Promise<ParsedBankSMS | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) return null;

  try {
    const groq = new Groq({ apiKey });
    const prompt = `
You are an expert Indian Bank SMS transaction parser.
Analyze this SMS text:
"${rawText}"

Extract and return STRICT JSON with these exact fields:
{
  "is_bank_sms": boolean (true if this is a financial debit/credit transaction message),
  "type": "debit" | "credit" | "unknown",
  "amount": number (positive float, e.g. 250.00),
  "merchant": string (clean store, recipient, or employer name, e.g. "Swiggy", "KFC", "Aptean Salary", "Petrol"),
  "category": "food" | "transport" | "shopping" | "utilities" | "entertainment" | "medical" | "salary" | "other",
  "bank_name": string or null (e.g. "HDFC Bank", "State Bank of India", "ICICI Bank"),
  "account_last4": string or null (last 3-4 digits of account or card),
  "balance": number or null (available balance if mentioned, e.g. 35420.50)
}
Respond with JSON only. No markdown, no explanations.
`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You output only valid minified JSON." },
        { role: "user", content: prompt },
      ],
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content?.trim();
    if (!responseContent) return null;

    const data = JSON.parse(responseContent);
    if (!data.is_bank_sms || !data.amount || isNaN(Number(data.amount))) {
      return null;
    }

    return {
      is_bank_sms: Boolean(data.is_bank_sms),
      type: data.type === "credit" ? "credit" : data.type === "debit" ? "debit" : "unknown",
      amount: Math.abs(Number(data.amount)),
      merchant: data.merchant || "Transaction",
      category: data.category || "other",
      bank_name: data.bank_name || undefined,
      account_last4: data.account_last4 ? String(data.account_last4) : undefined,
      balance: data.balance && !isNaN(Number(data.balance)) ? Number(data.balance) : undefined,
      raw_sms: rawText,
      confidence: "ai",
    };
  } catch (err) {
    console.warn("Groq AI SMS parsing failed, skipping AI fallback:", err);
    return null;
  }
}

/**
 * Main Smart SMS Parser (Hybrid: Fast Regex -> Groq AI Fallback)
 */
export async function parseBankSMS(rawText: string): Promise<ParsedBankSMS | null> {
  if (!rawText || typeof rawText !== "string") return null;

  // 1. Try high-speed Regex parser first
  const regexResult = parseBankSMSRegex(rawText);
  if (regexResult && regexResult.amount > 0 && regexResult.merchant && regexResult.merchant !== "Card / UPI Transaction") {
    return regexResult;
  }

  // 2. If regex had low confidence or missed merchant/account, use Groq AI
  const aiResult = await parseBankSMSWithAI(rawText);
  if (aiResult) {
    return aiResult;
  }

  // 3. Fallback to regex result if AI wasn't available
  return regexResult;
}
