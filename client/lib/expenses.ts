export type ExpenseCategory =
  | "food"
  | "transport"
  | "education"
  | "rent"
  | "entertainment"
  | "shopping"
  | "utilities"
  | "medical"
  | "other";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  note?: string;
  chat_id?: string;
  source?: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly' | 'one-time' | 'spot' | 'bonus';
  description?: string;
  date?: string | Date;
}

export interface Budget {
  monthly: number;
  weekly: number;
  savingsGoal: number;
  income?: number;
  incomeSources?: IncomeSource[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  category?: string;
}



export const categoryEmojis: Record<ExpenseCategory, string> = {
  food: "🍔",
  transport: "🚗",
  education: "📚",
  rent: "🏠",
  entertainment: "🎬",
  shopping: "🛍️",
  utilities: "⚡",
  medical: "🏥",
  other: "📌",
};

export const categoryColors: Record<ExpenseCategory, string> = {
  food: "bg-orange-100 text-orange-700 border-orange-200",
  transport: "bg-blue-100 text-blue-700 border-blue-200",
  education: "bg-purple-100 text-purple-700 border-purple-200",
  rent: "bg-red-100 text-red-700 border-red-200",
  entertainment: "bg-pink-100 text-pink-700 border-pink-200",
  shopping: "bg-green-100 text-green-700 border-green-200",
  utilities: "bg-yellow-100 text-yellow-700 border-yellow-200",
  medical: "bg-teal-100 text-teal-700 border-teal-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

export const categoryBgCharts: Record<ExpenseCategory, string> = {
  food: "#FBA040",
  transport: "#1E5FB6",
  education: "#9333EA",
  rent: "#DC2626",
  entertainment: "#DB2777",
  shopping: "#16A34A",
  utilities: "#CA8A04",
  medical: "#14B8A6",
  other: "#6B7280",
};

export function getTotalSpent(
  expenses: Expense[],
  startDate: Date,
  endDate: Date,
): number {
  return expenses
    .filter((exp) => exp.date >= startDate && exp.date <= endDate)
    .reduce((sum, exp) => sum + exp.amount, 0);
}

export function getSpentByCategory(
  expenses: Expense[],
  startDate: Date,
  endDate: Date,
): Record<ExpenseCategory, number> {
  const result: Record<ExpenseCategory, number> = {
    food: 0,
    transport: 0,
    education: 0,
    rent: 0,
    entertainment: 0,
    shopping: 0,
    utilities: 0,
    medical: 0,
    other: 0,
  };

  expenses
    .filter((exp) => exp.date >= startDate && exp.date <= endDate)
    .forEach((exp) => {
      result[exp.category] += exp.amount;
    });

  return result;
}

// Removed rule-based unnecessary expenses filter
// Use AI insights instead for intelligent expense analysis
export function getUnnecessaryExpenses(
  expenses: Expense[],
  startDate: Date,
  endDate: Date,
): Expense[] {
  // Return empty array - let AI determine unnecessary expenses instead
  return [];
}

export const PAYMENT_ACCOUNTS = [
  { id: "Current Bank Account", label: "Current Bank Account", icon: "🏢", description: "Corporate / Business Primary Account" },
  { id: "Savings Bank Account", label: "Savings Bank Account", icon: "🏦", description: "Personal Savings & Emergency" },
  { id: "UPI", label: "UPI (GPay / PhonePe / Paytm)", icon: "📱", description: "Instant Mobile QR / Contact" },
  { id: "Cash", label: "Cash in Hand", icon: "💵", description: "Physical Cash & Coins" },
  { id: "Credit Card", label: "Credit Card", icon: "💳", description: "Monthly Card Limit" },
] as const;

export type PaymentAccount = typeof PAYMENT_ACCOUNTS[number]["id"];

export function getAccountBadge(source?: string | null): { label: string; icon: string; color: string } {
  if (!source) {
    return { label: "Current Bank Account", icon: "🏢", color: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  const s = source.toLowerCase();
  if (s.includes("current")) {
    return { label: "Current Bank Account", icon: "🏢", color: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (s.includes("saving")) {
    return { label: "Savings Account", icon: "🏦", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (s.includes("upi") || s.includes("gpay") || s.includes("phonepe") || s.includes("paytm")) {
    return { label: "UPI", icon: "📱", color: "bg-purple-50 text-purple-700 border-purple-200" };
  }
  if (s.includes("cash")) {
    return { label: "Cash", icon: "💵", color: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (s.includes("credit") || s.includes("card")) {
    return { label: "Credit Card", icon: "💳", color: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  if (s.includes("telegram")) {
    return { label: "Telegram Bot", icon: "✈️", color: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  return { label: source, icon: "💳", color: "bg-slate-50 text-slate-700 border-slate-200" };
}

