import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  ArrowUpRight,
  Target,
  Plus,
  TrendingDown,
  Clock,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  Download,
  DollarSign,
  Activity,

  Eye,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Expense,
  ExpenseCategory,
  Budget,
  categoryEmojis,
  categoryColors,
  getTotalSpent,
} from "@/lib/expenses";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { AIInsights } from "@/components/AIInsights";
import { useAIInsights } from "@/hooks/use-ai-insights";
import { useAuth } from "@/hooks/use-auth";

// Helper to remove extra quotes if they exist from CSV import or similar
const cleanValue = (val: string | undefined | null) => {
  if (!val) return "";
  return val.replace(/^"+|"+$/g, "").trim();
};

export default function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget>({
    monthly: 0,
    weekly: 0,
    savingsGoal: 0,
    income: 0,
  });


  // AI Insights hook
  const {
    insights,
    loading: insightsLoading,
    error: insightsError,
    lastUpdated,
    refreshInsights
  } = useAIInsights(budget, expenses);

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to load expenses");
      const data = await res.json();
      const parsed = (data as any[]).map((e) => {
        const rawDate = cleanValue(e.date ?? e.createdAt);
        const rawCategory = cleanValue(e.category);
        const rawDescription = cleanValue(e.description);

        return {
          id:
            (typeof e._id === "object" && e._id.toString()) ||
            (typeof e._id === "string" && e._id) ||
            e.id ||
            `${rawDescription ?? "expense"}-${rawDate ?? ""}`,
          description: rawDescription,
          amount: Number(cleanValue(String(e.amount ?? 0))),
          category: (rawCategory?.toLowerCase() ?? "other") as ExpenseCategory,
          note: e.note ?? undefined,
          date: new Date(rawDate || Date.now()),
        };
      });
      // Sort by date desc
      parsed.sort((a, b) => b.date.getTime() - a.date.getTime());
      setExpenses(parsed);
    } catch (e) {
      console.error("Error loading expenses:", e);
    }
  };

  const loadBudget = () => {
    if (user) {
      const budgetKey = `budget_${user.id}`;
      const savedBudget = localStorage.getItem(budgetKey);
      if (savedBudget) {
        try {
          const parsed = JSON.parse(savedBudget);
          setBudget({
            monthly: parsed.monthly || 0,
            weekly: parsed.weekly || Math.round((parsed.monthly || 0) / 4),
            savingsGoal: parsed.savingsGoal || 0,
            income: parsed.income || 0,
            incomeSources: parsed.incomeSources || [],
          });
        } catch (e) {
          console.error("Error loading budget:", e);
        }
      }
    }
  };

  useEffect(() => {
    fetchExpenses();
    const interval = setInterval(fetchExpenses, 10000); // Poll every 10s

    loadBudget();

    // Listen for storage changes (when budget is updated in BudgetSettings)
    const handleStorageChange = () => {
      loadBudget();
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom storage event
    window.addEventListener('budgetUpdated', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('budgetUpdated', handleStorageChange);
    };
  }, [user]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const monthlySpent = getTotalSpent(expenses, monthStart, monthEnd);
  const monthlyRemaining = budget.monthly - monthlySpent;
  const monthlyProgress = budget.monthly > 0 ? (monthlySpent / budget.monthly) * 100 : 0;

  // Weekly calculations
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  const weekEnd = new Date(now);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weeklySpent = getTotalSpent(expenses, weekStart, weekEnd);
  const weeklyRemaining = budget.weekly - weeklySpent;
  const weeklyProgress = budget.weekly > 0 ? (weeklySpent / budget.weekly) * 100 : 0;

  // Top categories
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.date >= monthStart && e.date <= monthEnd) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, amount]) => ({
      category: cat as ExpenseCategory,
      amount,
    }));

  return (
    <Layout>
      <div className="min-h-screen bg-background p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 lg:space-y-8">
          {/* Professional Header Section */}
          <div className="bg-card rounded-3xl shadow-sm border border-border p-4 md:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/25">
                    <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                      Financial Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base lg:text-lg font-medium">
                      Complete overview of your financial health
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs md:text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Last updated: {new Date().toLocaleDateString()}</span>
                    <span className="sm:hidden">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 md:px-3 md:py-1 rounded-full">
                    <Activity className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="font-medium">Live Data</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="hidden lg:flex items-center gap-2 bg-muted/20 rounded-xl px-4 py-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    className="bg-transparent border-0 outline-0 text-sm text-foreground placeholder:text-muted-foreground w-32"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchExpenses}
                  className="gap-2 bg-card hover:bg-muted/20 border-border text-foreground shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Link to="/analytics" className="flex-1 sm:flex-none">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 bg-card hover:bg-muted/20 border-border text-foreground shadow-sm hover:shadow-md transition-all"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Analytics</span>
                  </Button>
                </Link>
                <Link to="/add-expense" className="flex-1 sm:flex-none">
                  <Button className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] hover:shadow-xl">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Expense</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Professional KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Monthly Budget Card */}
            <Card className="border-0 shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60 bg-card overflow-hidden relative group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet className="w-32 h-32 text-blue-500" />
              </div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest",
                      monthlyRemaining < 0
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-emerald-100/50 text-emerald-600 border border-emerald-100",
                    )}
                  >
                    Monthly
                  </span>
                </div>
                <div className="space-y-1 mb-6">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.15em]">
                    Total Spent
                  </p>
                  <h3 className="text-3xl font-bold text-foreground">
                    ₹{monthlySpent.toLocaleString()}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">
                      of ₹{budget.monthly.toLocaleString()}
                    </span>
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                      monthlyProgress > 100 ? "bg-red-50 text-red-600" :
                        monthlyProgress > 80 ? "bg-amber-50 text-amber-600" :
                          "bg-emerald-50 text-emerald-600"
                    )}>
                      {monthlyProgress > 100 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {monthlyProgress.toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        monthlyRemaining < 0
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : "bg-gradient-to-r from-blue-500 to-blue-600",
                      )}
                      style={{ width: `${Math.min(monthlyProgress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">
                      {monthlyProgress.toFixed(0)}% used
                    </span>
                    <span
                      className={cn(
                        "font-semibold",
                        monthlyRemaining < 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      )}
                    >
                      {monthlyRemaining < 0
                        ? `Over by ₹${Math.abs(monthlyRemaining).toLocaleString()}`
                        : `₹${monthlyRemaining.toLocaleString()} left`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Balance Card */}
            <Card className="border-0 shadow-lg shadow-emerald-200/60 dark:shadow-emerald-900/40 bg-card overflow-hidden relative group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <DollarSign className="w-32 h-32 text-emerald-500" />
              </div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-100/50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                    Balance
                  </span>
                </div>
                <div className="space-y-1 mb-6">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.15em]">
                    Available Budget
                  </p>
                  <h3 className="text-3xl font-bold text-foreground">
                    ₹{monthlyRemaining.toLocaleString()}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">
                      Monthly remaining
                    </span>
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                      <TrendingUp className="w-3 h-3" />
                      Available
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-500 font-medium text-sm mb-1">Monthly Budget</p>
                    <p className="font-bold text-foreground text-lg">₹{budget.monthly.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">Spent: ₹{monthlySpent.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights Card */}
            <AIInsights
              insights={insights}
              loading={insightsLoading}
              error={insightsError}
              lastUpdated={lastUpdated}
              onRefresh={refreshInsights}
              compact={true}
            />
          </div>

          {/* AI Insights Section - Square Boxes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <AIInsights
              insights={insights}
              loading={insightsLoading}
              error={insightsError}
              lastUpdated={lastUpdated}
              onRefresh={refreshInsights}
              compact={false}
            />
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Recent Transactions</h2>
                      <p className="text-sm text-muted-foreground">Latest expense activity</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="w-4 h-4" />
                      Filter
                    </Button>
                    <Link to="/analytics">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="w-4 h-4" />
                        View All
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {expenses.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {expenses.slice(0, 5).map((expense) => (
                      <div
                        key={expense.id}
                        className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-300",
                              categoryColors[expense.category]
                                ? `bg-${categoryColors[expense.category]}-50`
                                : "bg-slate-50",
                            )}
                          >
                            {categoryEmojis[expense.category]}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {expense.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="capitalize px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                {expense.category}
                              </span>
                              <span>•</span>
                              <span>{expense.date.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            -₹{expense.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 mx-auto flex items-center justify-center mb-4">
                      <Wallet className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      No expenses yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Start tracking your spending to see it here.
                    </p>
                    <Link to="/add-expense">
                      <Button variant="outline">Add First Expense</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Side Panel: Top Spend & Actions */}
            <div className="space-y-6">
              {/* Top Categories */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-muted-foreground" />
                  Top Spending
                </h3>
                {sortedCategories.length > 0 ? (
                  <div className="space-y-5">
                    {sortedCategories.map((item) => (
                      <div key={item.category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span>{categoryEmojis[item.category]}</span>
                            <span className="font-medium text-slate-700 capitalize">
                              {item.category}
                            </span>
                          </div>
                          <span className="font-bold text-foreground">
                            ₹{item.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-800 rounded-full"
                            style={{
                              width: `${(
                                (item.amount / monthlySpent) *
                                100
                              ).toFixed(0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Data will appear here
                  </p>
                )}
              </div>

              {/* Enhanced Quick Actions */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden border border-slate-700/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 rounded-full -ml-12 -mb-12 blur-xl"></div>

                <div className="relative z-10">
                  <h3 className="font-bold mb-6 text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Link to="/budget">
                      <Button variant="secondary" className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm transition-all hover:scale-[1.02] group">
                        <Target className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                          <div className="font-medium">Adjust Budget</div>
                          <div className="text-xs text-white/70">Modify spending limits</div>
                        </div>
                      </Button>
                    </Link>
                    <Link to="/settings">
                      <Button variant="secondary" className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm transition-all hover:scale-[1.02] group">
                        <Download className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                          <div className="font-medium">Export Data</div>
                          <div className="text-xs text-white/70">Download your records</div>
                        </div>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
