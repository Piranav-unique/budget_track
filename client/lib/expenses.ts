export type ExpenseCategory =
  | "food"
  | "transport"
  | "education"
  | "rent"
  | "entertainment"
  | "shopping"
  | "utilities"
  | "other";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  note?: string;
}

export interface Budget {
  monthly: number;
  weekly: number;
  savingsGoal: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  category?: string;
}

const categoryKeywords: Record<ExpenseCategory, string[]> = {
  food: [
    "food",
    "lunch",
    "dinner",
    "breakfast",
    "coffee",
    "restaurant",
    "groceries",
    "pizza",
    "burger",
    "snack",
    "meal",
    "cafe",
  ],
  transport: [
    "uber",
    "taxi",
    "gas",
    "petrol",
    "bus",
    "train",
    "metro",
    "parking",
    "fuel",
    "transport",
    "bike",
    "car",
    "auto",
  ],
  education: [
    "tuition",
    "book",
    "course",
    "school",
    "college",
    "university",
    "class",
    "lesson",
    "study",
    "education",
    "notes",
    "stationery",
  ],
  rent: [
    "rent",
    "apartment",
    "housing",
    "lease",
    "accommodation",
    "house",
    "dorm",
  ],
  entertainment: [
    "movie",
    "cinema",
    "game",
    "concert",
    "music",
    "show",
    "entertainment",
    "fun",
    "gaming",
    "streaming",
    "subscription",
    "spotify",
    "netflix",
  ],
  shopping: [
    "shopping",
    "clothes",
    "dress",
    "shoes",
    "apparel",
    "mall",
    "store",
    "amazon",
    "shirt",
    "pants",
  ],
  utilities: [
    "electricity",
    "water",
    "internet",
    "phone",
    "bill",
    "utility",
    "broadband",
    "mobile",
  ],
  other: [],
};

export function categorizeExpense(description: string): ExpenseCategory {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category as ExpenseCategory;
      }
    }
  }

  return "other";
}

export const categoryEmojis: Record<ExpenseCategory, string> = {
  food: "🍔",
  transport: "🚗",
  education: "📚",
  rent: "🏠",
  entertainment: "🎬",
  shopping: "🛍️",
  utilities: "⚡",
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
    other: 0,
  };

  expenses
    .filter((exp) => exp.date >= startDate && exp.date <= endDate)
    .forEach((exp) => {
      result[exp.category] += exp.amount;
    });

  return result;
}

export function getUnnecessaryExpenses(
  expenses: Expense[],
  startDate: Date,
  endDate: Date,
): Expense[] {
  const categorySpending = getSpentByCategory(expenses, startDate, endDate);
  const avgAmount =
    getTotalSpent(expenses, startDate, endDate) / (expenses.length || 1);

  return expenses
    .filter((exp) => exp.date >= startDate && exp.date <= endDate)
    .filter(
      (exp) =>
        exp.amount > avgAmount * 1.5 ||
        (exp.category === "entertainment" && exp.amount > avgAmount),
    )
    .sort((a, b) => b.amount - a.amount);
}

export function suggestSavings(expenses: Expense[], budget: Budget): string[] {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);

  const spending = getSpentByCategory(expenses, monthStart, monthEnd);
  const suggestions: string[] = [];

  if (spending.food > budget.monthly * 0.3) {
    suggestions.push(
      "💡 Consider meal planning to reduce food expenses by 15-20%.",
    );
  }
  if (spending.entertainment > budget.monthly * 0.15) {
    suggestions.push(
      "💡 Entertainment spending is high. Cancel unused subscriptions and reduce outings.",
    );
  }
  if (spending.shopping > budget.monthly * 0.15) {
    suggestions.push(
      "💡 Shopping expenses are above average. Practice the 30-day rule before purchases.",
    );
  }
  if (spending.transport > budget.monthly * 0.2) {
    suggestions.push(
      "💡 Consider using public transit more or carpooling to save on transport costs.",
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "✅ Great job! Your spending is well-balanced. Keep it up!",
    );
  }

  return suggestions;
}
