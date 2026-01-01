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
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'bi-weekly' | 'yearly';
  description?: string;
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
