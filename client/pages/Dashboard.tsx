import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  AlertCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Expense,
  Budget,
  categoryEmojis,
  categoryColors,
  getTotalSpent,
  getSpentByCategory,
  suggestSavings,
} from "@/lib/expenses";

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget>({
    monthly: 2000,
    weekly: 500,
    savingsGoal: 500,
  });

  useEffect(() => {
    const saved = localStorage.getItem("expenses");
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((e: any) => ({
          ...e,
          date: new Date(e.date),
        }));
        setExpenses(parsed);
      } catch (e) {
        console.error("Error loading expenses:", e);
      }
    }

    const savedBudget = localStorage.getItem("budget");
    if (savedBudget) {
      try {
        setBudget(JSON.parse(savedBudget));
      } catch (e) {
        console.error("Error loading budget:", e);
      }
    }
  }, []);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const monthlySpent = getTotalSpent(expenses, monthStart, monthEnd);
  const weeklySpent = getTotalSpent(expenses, weekStart, weekEnd);
  const monthlyRemaining = budget.monthly - monthlySpent;
  const weeklyRemaining = budget.weekly - weeklySpent;
  const monthlyPercentage = (monthlySpent / budget.monthly) * 100;
  const weeklyPercentage = (weeklySpent / budget.weekly) * 100;

  const categorySpending = getSpentByCategory(expenses, monthStart, monthEnd);
  const topCategories = Object.entries(categorySpending)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const recentExpenses = expenses
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const suggestions = suggestSavings(expenses, budget);
  const hasWarning = monthlyPercentage > 90 || weeklyPercentage > 90;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your financial overview for this month.
          </p>
        </div>

        {/* Budget Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Budget Card */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Monthly Budget
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  ${monthlySpent.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  of ${budget.monthly.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span
                  className={cn(
                    "font-semibold",
                    monthlyPercentage > 90
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {monthlyPercentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    monthlyPercentage > 90 ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
                />
              </div>
              <p
                className={cn(
                  "text-xs mt-3 font-medium",
                  monthlyRemaining < 0 ? "text-destructive" : "text-secondary",
                )}
              >
                {monthlyRemaining < 0 ? "Over budget by" : "Remaining:"} $
                {Math.abs(monthlyRemaining).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Weekly Budget Card */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Weekly Budget
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  ${weeklySpent.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  of ${budget.weekly.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6 text-secondary" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span
                  className={cn(
                    "font-semibold",
                    weeklyPercentage > 90
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {weeklyPercentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    weeklyPercentage > 90 ? "bg-destructive" : "bg-secondary",
                  )}
                  style={{ width: `${Math.min(weeklyPercentage, 100)}%` }}
                />
              </div>
              <p
                className={cn(
                  "text-xs mt-3 font-medium",
                  weeklyRemaining < 0 ? "text-destructive" : "text-secondary",
                )}
              >
                {weeklyRemaining < 0 ? "Over budget by" : "Remaining:"} $
                {Math.abs(weeklyRemaining).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Alert for Budget Exceeded */}
        {hasWarning && (
          <div className="mb-8 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Budget Alert!</p>
              <p className="text-sm text-destructive/80 mt-1">
                You've spent over 90% of your budget. Be careful with your
                remaining spending!
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Spending Categories */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Top Spending Categories
            </h2>
            {topCategories.length > 0 ? (
              <div className="space-y-3">
                {topCategories.map(([category, amount]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">
                        {categoryEmojis[category as any]}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground capitalize">
                          {category}
                        </p>
                        <div className="w-24 h-2 bg-border rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${(amount / monthlySpent) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        ${amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((amount / monthlySpent) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No expenses yet. Start tracking!
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-sm p-6 text-primary-foreground">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/add-expense" className="block">
                <Button className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </Link>
              <Link to="/budget" className="block">
                <Button
                  variant="outline"
                  className="w-full border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Set Budget
                </Button>
              </Link>
              <Link to="/analytics" className="block">
                <Button
                  variant="outline"
                  className="w-full border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                >
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Recent Expenses
            </h2>
            {recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">
                        {categoryEmojis[expense.category]}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {expense.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {expense.date.toLocaleDateString()} •{" "}
                          <span className="capitalize">{expense.category}</span>
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-foreground">
                      ${expense.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No expenses recorded yet.
              </p>
            )}
          </div>

          {/* Money Habits & Tips */}
          <div className="bg-gradient-to-br from-secondary to-secondary/80 rounded-xl shadow-sm p-6 text-secondary-foreground">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5" />
              <h2 className="text-lg font-bold">Money Habits</h2>
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <p key={idx} className="text-sm leading-relaxed">
                  {suggestion}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
