import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp, TrendingDown, Calendar, DollarSign, Clock, Sparkles, Copy, Zap, Target, Lightbulb, RefreshCcw, Edit2, Trash2, X, BarChart3, Award, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { ExpenseCategory, categoryEmojis, Expense, getTotalSpent } from "@/lib/expenses";
import { useAuth } from "@/hooks/use-auth";

const categories: ExpenseCategory[] = [
  "food",
  "transport",
  "education",
  "rent",
  "entertainment",
  "shopping",
  "utilities",
  "medical",
  "other",
];

function AddExpenseContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCategorizingAI, setIsCategorizingAI] = useState(false);
  const [categorizationMethod, setCategorizationMethod] = useState<'ai' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState({ monthly: 0, weekly: 0, savingsGoal: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);


  useEffect(() => {
    if (!description.trim()) {
      setCategory("other");
      setCategorizationMethod(null);
      return;
    }

    // Debounce the API call
    const timeoutId = setTimeout(async () => {
      setIsCategorizingAI(true);

      try {
        const response = await fetch('/api/categorize-expense', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ description }),
        });

        if (response.ok) {
          const data = await response.json();
          setCategory(data.category as ExpenseCategory);
          setCategorizationMethod(data.method);
        } else {
          // API failed
          console.warn('AI categorization failed:', response.status);
          setCategory("other");
          setCategorizationMethod(null);
        }
      } catch (error) {
        // Network error
        console.warn('AI categorization error:', error);
        setCategory("other");
        setCategorizationMethod(null);
      } finally {
        setIsCategorizingAI(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [description]);

  // Fetch expenses and budget for sidebars
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch expenses
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        const parsed = data.map((e: any) => {
          const rawDate = e.date ?? e.created_at ?? e.createdAt;
          return {
            id: e.id || e._id?.toString() || `${e.description || 'expense'}-${rawDate}`,
            description: e.description || "",
            amount: Number(e.amount || 0),
            category: (e.category?.toLowerCase() || "other") as ExpenseCategory,
            note: e.note || undefined,
            date: new Date(rawDate || Date.now()),
          };
        });
        parsed.sort((a: Expense, b: Expense) => b.date.getTime() - a.date.getTime());
        setExpenses(parsed);
      }
    } catch (e) {
      console.error("Error loading expenses:", e);
    }

    // Load budget from user-specific localStorage
    if (user) {
      const budgetKey = `budget_${user.id}`;
      const savedBudget = localStorage.getItem(budgetKey);
      if (savedBudget) {
        try {
          const parsedBudget = JSON.parse(savedBudget);
          setBudget(parsedBudget);
        } catch (e) {
          console.error("Error loading budget:", e);
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Refresh data every 10 seconds to keep it updated
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const todaySpent = expenses
    .filter(e => e.date >= today && e.date < new Date(today.getTime() + 86400000))
    .reduce((sum, e) => sum + e.amount, 0);

  const weekSpent = getTotalSpent(expenses, weekStart, weekEnd);
  const monthSpent = getTotalSpent(expenses, monthStart, monthEnd);

  const recentExpenses = expenses.slice(0, 5);

  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.date >= monthStart && e.date <= monthEnd) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
  });

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Calculate spending velocity and projections
  const daysInMonth = monthEnd.getDate();
  const currentDay = now.getDate();
  const dailyAverage = currentDay > 0 ? monthSpent / currentDay : 0;
  const projectedMonthly = dailyAverage * daysInMonth;
  // Removed rule-based budget health calculations - use AI insights instead
  const budgetHealth = budget.monthly > 0 ? ((budget.monthly - monthSpent) / budget.monthly) * 100 : 100;
  // Removed rule-based "on track" determination - let AI analyze this

  // Get most common expenses for quick add
  const commonExpenses = expenses
    .reduce((acc: Record<string, number>, e) => {
      const key = e.description.toLowerCase().trim();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  const mostCommon = Object.entries(commonExpenses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([desc]) => expenses.find(e => e.description.toLowerCase().trim() === desc))
    .filter(Boolean) as Expense[];

  // Get last expense for quick duplicate
  const lastExpense = expenses[0];

  // Calculate category percentages
  const categoryPercentages = Object.entries(categoryTotals).map(([cat, amt]) => ({
    category: cat,
    amount: amt,
    percentage: monthSpent > 0 ? (amt / monthSpent) * 100 : 0
  })).sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Additional stats for left sidebar
  const monthlyExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
  const avgTransactionSize = monthlyExpenses.length > 0 ? monthSpent / monthlyExpenses.length : 0;
  const largestExpense = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((max, e) => e.amount > max.amount ? e : max, monthlyExpenses[0])
    : null;

  // Previous month comparison
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevMonthSpent = getTotalSpent(expenses, prevMonthStart, prevMonthEnd);
  const monthChange = prevMonthSpent > 0 ? ((monthSpent - prevMonthSpent) / prevMonthSpent) * 100 : 0;

  // Remaining days calculation
  const remainingDays = daysInMonth - currentDay;
  const remainingBudget = budget.monthly > 0 ? budget.monthly - monthSpent : 0;
  const dailyBudgetRemaining = remainingDays > 0 && budget.monthly > 0
    ? remainingBudget / remainingDays
    : 0;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }
    if (!date) {
      newErrors.date = "Date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Budget Enforcement Check
    const newAmount = parseFloat(amount);
    let potentialSpent = monthSpent + newAmount;

    if (editingExpenseId) {
      const originalExpense = expenses.find(e => e.id === editingExpenseId);
      if (originalExpense) {
        // Only adjust if the original expense was in the same month as current month
        const isOriginalInSameMonth = originalExpense.date.getFullYear() === now.getFullYear() &&
          originalExpense.date.getMonth() === now.getMonth();
        if (isOriginalInSameMonth) {
          potentialSpent = monthSpent - originalExpense.amount + newAmount;
        }
      }
    }

    if (budget.monthly > 0 && potentialSpent > budget.monthly) {
      const overBy = potentialSpent - budget.monthly;
      const currentAvailable = Math.max(0, budget.monthly - (editingExpenseId ? (monthSpent - (expenses.find(e => e.id === editingExpenseId)?.amount || 0)) : monthSpent));

      alert(`Monthly Budget Limit Reached!\n\nAdding this expense of ₹${newAmount.toLocaleString()} will exceed your monthly budget limit of ₹${budget.monthly.toLocaleString()} by ₹${overBy.toLocaleString()}.\n\nAvailable Budget: ₹${currentAvailable.toLocaleString()}\nTotal after this: ₹${potentialSpent.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const url = editingExpenseId
        ? `/api/expenses/${editingExpenseId}`
        : "/api/expenses";

      const method = editingExpenseId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          category,
          date,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${editingExpenseId ? 'update' : 'save'} expense`);
      }

      // Refresh expenses data after successful submission
      await fetchData();

      // Reset form
      setDescription("");
      setAmount("");
      setCategory("other");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
      setEditingExpenseId(null);

      // Small delay to show success, then navigate
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${editingExpenseId ? 'update' : 'save'} expense`;
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setDate(expense.date.toISOString().split("T")[0]);
    setNote(expense.note || "");
    setEditingExpenseId(expense.id);
    setSubmitError(null);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      return;
    }

    setDeletingExpenseId(expenseId);
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete expense");
      }

      // Refresh expenses data
      await fetchData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete expense";
      alert(message);
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleCancelEdit = () => {
    setDescription("");
    setAmount("");
    setCategory("other");
    setDate(new Date().toISOString().split("T")[0]);
    setNote("");
    setEditingExpenseId(null);
    setSubmitError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Enhanced Features */}
        <div className="lg:col-span-3 space-y-4 hidden lg:block">
          <div className="sticky top-4 space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Quick Actions */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Quick Actions
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={fetchData}
                        title="Refresh data"
                      >
                        <RefreshCcw className="w-3 h-3" />
                      </Button>
                    </div>
                    {lastExpense ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setDescription(lastExpense.description);
                          setAmount(lastExpense.amount.toString());
                          setCategory(lastExpense.category);
                          setDate(new Date().toISOString().split("T")[0]);
                          setNote("");
                        }}
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate Last Expense
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Add an expense to enable quick actions
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Expenses - Enhanced */}
                <Collapsible defaultOpen={true}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Recent Expenses
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-4 pt-2">
                        {recentExpenses.length > 0 ? (
                          <div className="space-y-2">
                            {recentExpenses.map((expense) => (
                              <div
                                key={expense.id}
                                className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all border border-transparent hover:border-blue-200 group"
                              >
                                <div
                                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                  onClick={() => {
                                    setDescription(expense.description);
                                    setAmount(expense.amount.toString());
                                    setCategory(expense.category);
                                    setDate(expense.date.toISOString().split("T")[0]);
                                    setNote(expense.note || "");
                                  }}
                                >
                                  <div className="text-2xl group-hover:scale-110 transition-transform">
                                    {categoryEmojis[expense.category]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                      {expense.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <p className="text-xs text-muted-foreground capitalize">{expense.category}</p>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <p className="text-xs text-muted-foreground">
                                        {expense.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-bold text-primary">₹{expense.amount.toFixed(0)}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(expense);
                                    }}
                                    title="Edit expense"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(expense.id);
                                    }}
                                    disabled={deletingExpenseId === expense.id}
                                    title="Delete expense"
                                  >
                                    {deletingExpenseId === expense.id ? (
                                      <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No expenses yet
                          </p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Category Breakdown */}
                {categoryPercentages.length > 0 && (
                  <Collapsible defaultOpen={true}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Category Breakdown
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-4 pt-2">
                          <div className="space-y-3">
                            {categoryPercentages.map(({ category, amount, percentage }) => (
                              <div key={category} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{categoryEmojis[category as ExpenseCategory]}</span>
                                    <span className="capitalize font-medium">{category}</span>
                                  </div>
                                  <span className="font-semibold">₹{amount.toFixed(0)}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of monthly spending</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Common Expenses */}
                {mostCommon.length > 0 && (
                  <Collapsible defaultOpen={true}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Frequently Added
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-4 pt-2">
                          <div className="space-y-2">
                            {mostCommon.map((expense, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2 h-auto py-2"
                                onClick={() => {
                                  setDescription(expense.description);
                                  setCategory(expense.category);
                                  setDate(new Date().toISOString().split("T")[0]);
                                }}
                              >
                                <span>{categoryEmojis[expense.category]}</span>
                                <span className="text-xs truncate flex-1 text-left">{expense.description}</span>
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Spending Insights */}
                <Collapsible defaultOpen={false}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Spending Insights
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-4 pt-2">
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">Avg Transaction</p>
                            <p className="text-lg font-bold">₹{avgTransactionSize.toFixed(0)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {monthlyExpenses.length} transactions this month
                            </p>
                          </div>
                          {largestExpense && (
                            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-orange-700">Largest Expense</p>
                                <Award className="w-3 h-3 text-orange-600" />
                              </div>
                              <p className="text-sm font-bold text-orange-900 truncate">{largestExpense.description}</p>
                              <p className="text-lg font-bold text-orange-700">₹{largestExpense.amount.toFixed(0)}</p>
                              <p className="text-xs text-orange-600 mt-1 capitalize">{largestExpense.category}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </>
            )}
          </div>
        </div>

        {/* Main Form - Center */}
        <div className="lg:col-span-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  {editingExpenseId ? "Edit Expense" : "Add New Expense"}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {editingExpenseId
                    ? "Update your expense details"
                    : "Track your spending and get automatic categorization"}
                </p>
              </div>
              {editingExpenseId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel Edit
                </Button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <Label
                htmlFor="description"
                className="text-base font-semibold text-foreground"
              >
                What did you spend on?
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Be specific (e.g., "Lunch at Chipotle", "Bus fare")
              </p>
              <Input
                id="description"
                placeholder="e.g., Coffee at Starbucks"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={cn(
                  "text-base py-6",
                  errors.description && "border-destructive",
                )}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-2">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <Label
                  htmlFor="amount"
                  className="text-base font-semibold text-foreground"
                >
                  Amount
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">INR (₹)</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    ₹
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className={cn(
                      "text-base py-6 pl-8",
                      errors.amount && "border-destructive",
                    )}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive mt-2">{errors.amount}</p>
                )}
              </div>

              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <Label
                  htmlFor="date"
                  className="text-base font-semibold text-foreground"
                >
                  Date
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  When did you spend this?
                </p>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(
                    "text-base py-6",
                    errors.date && "border-destructive",
                  )}
                />
                {errors.date && (
                  <p className="text-sm text-destructive mt-2">{errors.date}</p>
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <Label className="text-base font-semibold text-foreground">
                Category
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {isCategorizingAI ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    AI is analyzing...
                  </span>
                ) : description.trim() ? (
                  <span className="flex items-center gap-2">
                    We suggest "{category}"
                    {categorizationMethod === 'ai' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        ✨ AI
                      </span>
                    )}
                  </span>
                ) : (
                  "Choose a category for this expense"
                )}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all font-medium text-sm capitalize flex items-center justify-center gap-2",
                      category === cat
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/50",
                    )}
                  >
                    <span className="text-xl">{categoryEmojis[cat]}</span>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <Label
                htmlFor="note"
                className="text-base font-semibold text-foreground"
              >
                Additional Notes (Optional)
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Add any extra details about this expense
              </p>
              <Textarea
                id="note"
                placeholder="e.g., paid with credit card, needed for class..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="text-base py-3 resize-none"
                rows={3}
              />
            </div>

            {description && amount && (
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl border border-primary/20 p-6">
                <p className="text-sm text-muted-foreground mb-3">Summary</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{categoryEmojis[category]}</span>
                    <div className="flex-1 ml-4">
                      <p className="font-semibold text-foreground">
                        {description}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {category}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      ₹{parseFloat(amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? (editingExpenseId ? "Updating..." : "Saving...")
                  : (editingExpenseId ? "Update Expense" : "Add Expense")}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Sidebar - Enhanced Stats & Insights */}
        <div className="lg:col-span-3 space-y-4 hidden lg:block">
          <div className="sticky top-4 space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Collapsible defaultOpen={true}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Quick Stats
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-4 pt-2 space-y-4">

                        {/* Today's Spending */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-700">Today</span>
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <p className="text-2xl font-bold text-blue-900">₹{todaySpent.toFixed(2)}</p>
                          {dailyAverage > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Avg: ₹{dailyAverage.toFixed(0)}/day
                            </p>
                          )}
                        </div>

                        {/* This Week with Progress */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-purple-700">This Week</span>
                            <TrendingUp className="w-4 h-4 text-purple-600" />
                          </div>
                          <p className="text-2xl font-bold text-purple-900">₹{weekSpent.toFixed(2)}</p>
                          {budget.weekly > 0 ? (
                            <>
                              <div className="h-2 bg-purple-200 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all bg-purple-500"
                                  style={{ width: `${Math.min((weekSpent / budget.weekly) * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-purple-600 mt-1">
                                {((weekSpent / budget.weekly) * 100).toFixed(0)}% of ₹{budget.weekly.toLocaleString()} budget
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                              Set weekly budget in settings
                            </p>
                          )}
                        </div>

                        {/* This Month with Progress */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-emerald-700">This Month</span>
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                          </div>
                          <p className="text-2xl font-bold text-emerald-900">₹{monthSpent.toFixed(2)}</p>
                          {budget.monthly > 0 ? (
                            <>
                              <div className="h-2 bg-emerald-200 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all bg-emerald-500"
                                  style={{ width: `${Math.min((monthSpent / budget.monthly) * 100, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-emerald-600">
                                  {((monthSpent / budget.monthly) * 100).toFixed(0)}% of ₹{budget.monthly.toLocaleString()}
                                </p>
                                <p className="text-xs font-semibold text-emerald-700">
                                  ₹{Math.max(0, budget.monthly - monthSpent).toFixed(0)} left
                                </p>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                              Set monthly budget in settings
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Budget Health Indicator - Data Only, No Rules */}
                {budget.monthly > 0 && (
                  <Collapsible defaultOpen={true}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Budget Projection
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-4 pt-2">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Projected Monthly</span>
                              <span className="text-sm font-bold text-foreground">
                                ₹{projectedMonthly.toFixed(0)}
                              </span>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground mb-1">Daily Average</p>
                              <p className="text-lg font-bold">₹{dailyAverage.toFixed(0)}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Day {currentDay} of {daysInMonth}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2 text-xs h-8 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                              onClick={() => navigate('/ai-insights')}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              View AI Insights
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Top Categories - Enhanced */}
                {topCategories.length > 0 && (
                  <Collapsible defaultOpen={true}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Top Categories
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-4 pt-2">
                          <div className="space-y-3">
                            {topCategories.map(([cat, amt], idx) => {
                              const percentage = monthSpent > 0 ? (amt / monthSpent) * 100 : 0;
                              return (
                                <div key={cat} className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{categoryEmojis[cat as ExpenseCategory]}</span>
                                      <span className="text-xs font-medium capitalize">{cat}</span>
                                      {idx === 0 && (
                                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">
                                          #1
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-bold">₹{amt.toFixed(0)}</span>
                                  </div>
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Month Comparison */}
                {prevMonthSpent > 0 && (
                  <Collapsible defaultOpen={false}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              {monthChange >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-emerald-500" />
                              )}
                              vs Last Month
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-4 pt-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">This Month</span>
                              <span className="text-sm font-bold">₹{monthSpent.toFixed(0)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Last Month</span>
                              <span className="text-sm font-semibold">₹{prevMonthSpent.toFixed(0)}</span>
                            </div>
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">
                                  {monthChange >= 0 ? 'Increase' : 'Decrease'}
                                </span>
                                <span className={cn(
                                  "text-sm font-bold",
                                  monthChange >= 0 ? "text-red-600" : "text-emerald-600"
                                )}>
                                  {monthChange >= 0 ? '+' : ''}{monthChange.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Remaining Budget */}
                {budget.monthly > 0 && remainingDays > 0 && (
                  <Collapsible defaultOpen={false}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Remaining Days
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-4 pt-2">
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                              <p className="text-xs text-blue-700 mb-1">Days Left</p>
                              <p className="text-2xl font-bold text-blue-900">{remainingDays}</p>
                              <p className="text-xs text-blue-600 mt-1">of {daysInMonth} days</p>
                            </div>
                            {remainingBudget > 0 && (
                              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                <p className="text-xs text-emerald-700 mb-1">Daily Budget</p>
                                <p className="text-lg font-bold text-emerald-900">₹{dailyBudgetRemaining.toFixed(0)}</p>
                                <p className="text-xs text-emerald-600 mt-1">per day to stay on track</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Quick Navigation */}
                <Collapsible defaultOpen={false}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <ArrowRight className="w-4 h-4" />
                            Quick Links
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-4 pt-2">
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => navigate("/dashboard")}
                          >
                            <BarChart3 className="w-4 h-4" />
                            View Dashboard
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => navigate("/analytics")}
                          >
                            <TrendingUp className="w-4 h-4" />
                            View Analytics
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => navigate("/budget")}
                          >
                            <Target className="w-4 h-4" />
                            Budget Settings
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Smart Suggestions */}
                <Collapsible defaultOpen={true}>
                  <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-600" />
                            Smart Tips
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-4 pt-2">
                        <div className="space-y-2 text-xs">
                          {budget.monthly === 0 && (
                            <p className="text-amber-700 font-medium">
                              💡 Set your monthly budget in Settings to track your spending goals
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            • Use specific descriptions for better AI categorization
                          </p>
                          <p className="text-muted-foreground">
                            • Add notes to remember payment methods or context
                          </p>
                          <p className="text-muted-foreground">
                            • Check Dashboard AI insights for intelligent spending analysis
                          </p>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddExpense() {
  return (
    <Layout>
      <AddExpenseContent />
    </Layout>
  );
}
