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
  Filter,
  Search,
  Zap,
  Briefcase,
  Building2,
  CheckCircle2,
  ArrowRightLeft,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  Layers,
  ArrowDownRight,
  PieChart,
  CalendarCheck,
  AlertCircle,
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
  getAccountBadge,
} from "@/lib/expenses";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { QuickAddIncomeModal } from "@/components/QuickAddIncomeModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAIInsights } from "@/hooks/use-ai-insights";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Helper to sanitize strings from CSV or DB
const cleanValue = (val: string | undefined | null) => {
  if (!val) return "";
  return val.replace(/^"+|"+$/g, "").trim();
};

const PIRANAV_INCOME_UPDATE_KEY = "piranav_monthly_income_update_v1";

function isPiranavUser(user: { username?: string; display_name?: string; email?: string } | null) {
  return [user?.username, user?.display_name, user?.email]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes("piranav"));
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [isLoggingCorporate, setIsLoggingCorporate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [budget, setBudget] = useState<Budget>({
    monthly: 20000,
    weekly: 5000,
    savingsGoal: 10000,
    income: 30000,
  });

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.accounts || []);
      }
    } catch (e) {
      console.warn("Could not load accounts:", e);
    }
  };

  const fetchBills = async () => {
    try {
      const res = await fetch("/api/bills");
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
      }
    } catch (e) {
      console.warn("Could not load bills:", e);
    }
  };

  const {
    insights,
    loading: insightsLoading,
    refreshInsights,
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
          source: e.source || "Current Bank Account",
          date: new Date(rawDate || Date.now()),
        };
      });
      parsed.sort((a, b) => b.date.getTime() - a.date.getTime());
      setExpenses(parsed);
    } catch (e) {
      console.error("Error loading expenses:", e);
    }
  };

  const handleQuickLogCorporate50 = async () => {
    setIsLoggingCorporate(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Daily Corporate Spend (Office / Tea / Snacks)",
          amount: 50,
          category: "food",
          date: new Date().toISOString().split("T")[0],
          source: "Current Bank Account",
          note: "Corporate company daily spend of ₹50 logged via 1-click",
        }),
      });

      if (!res.ok) throw new Error("Failed to log corporate spend");

      await fetchExpenses();
      await fetchAccounts();
      toast({
        title: "Office Spend Recorded",
        description: "Logged ₹50 office spend charged to Current Bank Account.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to log expense.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingCorporate(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      window.location.href = "/api/export/csv";
      toast({
        title: "Export Started",
        description: "Financial ledger downloading as CSV.",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Could not export CSV.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
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
            monthly: parsed.monthly || 20000,
            weekly: parsed.weekly || Math.round((parsed.monthly || 20000) / 4),
            savingsGoal: parsed.savingsGoal || 10000,
            income: parsed.income || 30000,
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
    fetchAccounts();
    fetchBills();
    const interval = setInterval(() => {
      fetchExpenses();
      fetchAccounts();
      fetchBills();
    }, 10000);

    loadBudget();

    const handleStorageChange = () => loadBudget();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("budgetUpdated", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("budgetUpdated", handleStorageChange);
    };
  }, [user]);

  const now = new Date();
  const currentMonthName = now.toLocaleString("default", { month: "long" });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - currentDay);
  const monthProgressPct = Math.round((currentDay / daysInMonth) * 100);

  const monthlySpent = getTotalSpent(expenses, monthStart, monthEnd);
  const monthlyLimit = budget.monthly || 20000;
  const monthlyRemaining = monthlyLimit - monthlySpent;
  const spendProgressPct = monthlyLimit > 0 ? (monthlySpent / monthlyLimit) * 100 : 0;
  const dailySafeSpend = Math.max(0, Math.round(monthlyRemaining / daysRemainingInMonth));

  // Corporate Spend Calculations
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // All Expenses Today & Burn Rate Calculations
  const todayExpenses = expenses.filter((e) => isSameDay(e.date, now));
  const todayTotalSpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayRemainingAllowance = Math.max(0, dailySafeSpend - todayTotalSpent);
  const todayBurnProgressPct = dailySafeSpend > 0 ? Math.min(100, Math.round((todayTotalSpent / dailySafeSpend) * 100)) : 0;
  const isTodayOverLimit = todayTotalSpent > dailySafeSpend;

  // Upcoming Bills (due within 5 days and unpaid this month)
  const upcomingBills = bills.filter((b) => !b.is_paid_this_month && b.days_until_due <= 5 && b.days_until_due >= 0);
  const totalUpcomingBillsAmount = upcomingBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const todayCorporateExpenses = expenses.filter(
    (e) =>
      isSameDay(e.date, now) &&
      ((e.description && e.description.toLowerCase().includes("corporate")) ||
        (e.amount === 50 && (e.category === "food" || (e.source && e.source.toLowerCase().includes("current")))))
  );

  const isCorporateLoggedToday = todayCorporateExpenses.length > 0;
  const corporateLoggedTodayAmount = todayCorporateExpenses.reduce((sum, e) => sum + e.amount, 0);

  const monthlyCorporateExpenses = expenses.filter(
    (e) =>
      e.date >= monthStart &&
      e.date <= monthEnd &&
      ((e.description && e.description.toLowerCase().includes("corporate")) ||
        (e.amount === 50 && e.category === "food"))
  );
  const monthlyCorporateTotal = monthlyCorporateExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Standard category budget allocations (Monarch / Copilot model)
  const categoryBudgets: { category: ExpenseCategory; name: string; limit: number; icon: string }[] = [
    { category: "food", name: "Food & Dining", limit: 6000, icon: "🍔" },
    { category: "transport", name: "Travel & Fuel", limit: 3000, icon: "🚗" },
    { category: "shopping", name: "Shopping", limit: 4000, icon: "🛍️" },
    { category: "utilities", name: "Bills & Utilities", limit: 2500, icon: "⚡" },
    { category: "entertainment", name: "Entertainment", limit: 2000, icon: "🎬" },
    { category: "medical", name: "Healthcare", limit: 1500, icon: "🏥" },
  ];

  // Calculate spent per category this month
  const categorySpentMap: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.date >= monthStart && e.date <= monthEnd) {
      categorySpentMap[e.category] = (categorySpentMap[e.category] || 0) + e.amount;
    }
  });

  // Filtered transactions for feed
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.source && e.source.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === "all" || e.category.toLowerCase() === selectedCategoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* 🌟 1. CLEAN TOP HEADER (COPILOT MONEY STYLE) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>{currentMonthName} {now.getFullYear()}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Synced
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Cash Flow & Spending
              </h1>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <ThemeToggle showLabel className="h-9 px-3" />

              <QuickAddIncomeModal
                trigger={
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer">
                    <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-200" />
                    + Add Income
                  </Button>
                }
                onSuccess={() => {
                  loadBudget();
                  fetchExpenses();
                  fetchAccounts();
                }}
              />

              <Link to="/add-expense">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  + Add Expense
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isExporting}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-2 rounded-xl"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchExpenses();
                  fetchAccounts();
                  refreshInsights();
                  toast({ title: "Updated", description: "Accounts and expenses reloaded." });
                }}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs p-2 rounded-xl"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* 💎 2. SIGNATURE CASH FLOW BAR (COPILOT MONEY #1 COMPONENT) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 md:p-8 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: Remaining Safe to Spend */}
              <div className="lg:col-span-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Left to Spend this Month
                </p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    ₹{monthlyRemaining.toLocaleString()}
                  </h2>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    of ₹{monthlyLimit.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block" />
                  <span>Safe to spend: <strong className="text-slate-900 dark:text-white">₹{dailySafeSpend} / day</strong> for {daysRemainingInMonth} days left</span>
                </p>
              </div>

              {/* Right Column: 3 Clean Metrics (Income, Spent, Savings) */}
              <div className="lg:col-span-7 grid grid-cols-3 gap-3 sm:gap-4 p-4 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Income
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    ₹{(budget.income || 30000).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1 border-l border-slate-200 dark:border-slate-800 pl-3 sm:pl-4">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" /> Spent
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    ₹{monthlySpent.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1 border-l border-slate-200 dark:border-slate-800 pl-3 sm:pl-4">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Savings Goal
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    ₹{(budget.savingsGoal || 10000).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Segmented Runway Progress Bar */}
            <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Month Passed: {monthProgressPct}% ({currentDay} of {daysInMonth} days)</span>
                <span>Budget Used: {spendProgressPct.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(spendProgressPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 📅 UPCOMING BILLS ALERT (If any due in next 5 days) */}
          {upcomingBills.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:to-slate-900 border border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm dark:shadow-lg">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Upcoming Bills Alert
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                      {upcomingBills.length} Due Soon
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                    ₹{totalUpcomingBillsAmount.toLocaleString()} commitment due in the next 5 days
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {upcomingBills.map((b) => `${b.name} (₹${b.amount} due ${b.days_until_due === 0 ? "today" : `in ${b.days_until_due}d`})`).join(" • ")}
                  </p>
                </div>
              </div>
              <Link to="/bills">
                <Button className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer">
                  <span>Pay & Settle Bills</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* ⚡ 2.5 SAFE-TO-SPEND TODAY PACING GAUGE */}
          <div className="rounded-2xl bg-gradient-to-br from-white via-white/95 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 border border-slate-200/90 dark:border-slate-800 p-5 md:p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                  isTodayOverLimit 
                    ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20"
                    : todayBurnProgressPct > 75
                    ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
                )}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Safe-to-Spend Today</h3>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      isTodayOverLimit
                        ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30"
                        : todayBurnProgressPct > 75
                        ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                        : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                    )}>
                      {isTodayOverLimit
                        ? "⚠️ Over Daily Budget"
                        : todayBurnProgressPct > 75
                        ? "⚡ Burn Rate Elevated"
                        : "🟢 Healthy Daily Pace"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dynamic daily burn runway based on remaining ₹{monthlyRemaining.toLocaleString()} over {daysRemainingInMonth} days
                  </p>
                </div>
              </div>

              {/* Quick 1-Click Office Spend CTA */}
              <Button
                onClick={handleQuickLogCorporate50}
                disabled={isLoggingCorporate}
                className={cn(
                  "shrink-0 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all",
                  isCorporateLoggedToday
                    ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                )}
              >
                <Zap className="w-3.5 h-3.5 mr-1 text-amber-300" />
                {isLoggingCorporate ? "Logging..." : isCorporateLoggedToday ? "+ Log Another ₹50" : "1-Click ₹50 Office Spend"}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-4 rounded-xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 mb-4">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Today's Remaining Allowance</p>
                <p className={cn("text-2xl font-black", isTodayOverLimit ? "text-rose-500 dark:text-rose-400" : "text-slate-900 dark:text-white")}>
                  ₹{todayRemainingAllowance.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500">Unspent safe limit for today</p>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Spent Today</p>
                <p className={cn("text-2xl font-black", isTodayOverLimit ? "text-rose-500 dark:text-rose-400" : "text-slate-900 dark:text-white")}>
                  ₹{todayTotalSpent.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500">
                  {todayExpenses.length} transaction{todayExpenses.length === 1 ? "" : "s"} today
                </p>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Daily Target Pace</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  ₹{dailySafeSpend.toLocaleString()} / day
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500">Recalculates automatically</p>
              </div>
            </div>

            {/* Daily burn progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Today's Allowance Consumed: {todayBurnProgressPct}%</span>
                <span>
                  {isTodayOverLimit
                    ? `₹${(todayTotalSpent - dailySafeSpend).toLocaleString()} over daily limit`
                    : `₹${todayRemainingAllowance.toLocaleString()} left before exceeding`}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isTodayOverLimit
                      ? "bg-rose-500"
                      : todayBurnProgressPct > 75
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  )}
                  style={{ width: `${Math.min(todayBurnProgressPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 🎯 3. MAIN SPLIT: CATEGORY BUDGETS & TRANSACTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left 7 Cols: Category Budgets (Monarch Money Style) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Category Budgets Card */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 md:p-6 shadow-sm dark:shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      Monthly Category Budgets
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Track spending limits per category</p>
                  </div>
                  <Link to="/budget" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1">
                    Edit Limits <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {categoryBudgets.map((cat) => {
                    const spent = categorySpentMap[cat.category] || 0;
                    const pct = Math.min(100, Math.round((spent / cat.limit) * 100));
                    const isOver = spent > cat.limit;

                    return (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            <strong className="text-slate-900 dark:text-white">₹{spent.toLocaleString()}</strong> of ₹{cat.limit.toLocaleString()}
                            <span className={cn("ml-2 font-semibold", isOver ? "text-rose-500 dark:text-rose-400" : "text-slate-400")}>
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              isOver
                                ? "bg-rose-500"
                                : pct > 80
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corporate Daily Office Spend Card (Aptean Madurai) */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 md:p-6 shadow-sm dark:shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                        Office Allowance
                      </span>
                      {isCorporateLoggedToday ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Logged Today (₹{corporateLoggedTodayAmount})
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending Today
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Daily Corporate Spend: ₹50 / day</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Snacks, tea, and lunch routine. Charged to Current Bank Account. Total this month: ₹{monthlyCorporateTotal}.
                    </p>
                  </div>

                  <Button
                    onClick={handleQuickLogCorporate50}
                    disabled={isLoggingCorporate}
                    className={cn(
                      "shrink-0 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all",
                      isCorporateLoggedToday
                        ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5 mr-1 text-amber-300" />
                    {isLoggingCorporate ? "Logging..." : isCorporateLoggedToday ? "+ Log Another ₹50" : "Log Today's ₹50"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Recent Transactions & Insights */}
            <div className="lg:col-span-5 space-y-6">

              {/* Transactions Feed */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 md:p-6 shadow-sm dark:shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      Recent Transactions
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Activity across all accounts</p>
                  </div>
                  <Link to="/analytics" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    View all ➔
                  </Link>
                </div>

                {/* Inline Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                {/* Transaction Rows */}
                {filteredExpenses.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredExpenses.slice(0, 6).map((expense) => (
                      <div key={expense.id} className="py-3 flex items-center justify-between group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                            {categoryEmojis[expense.category] || "📌"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                              {expense.description}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {expense.date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} • {expense.source || "Current Account"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right pl-3 shrink-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            -₹{expense.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No transactions recorded yet.
                  </div>
                )}
              </div>

              {/* Financial Health Tip (Quiet & Human) */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm dark:shadow-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Monthly Recommendation</span>
                </div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                  {insights[0]?.title || "Keep tracking daily"}
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {insights[0]?.message || "You are currently well within your monthly ₹20,000 spending limit. Continue maintaining your current pace."}
                </p>
              </div>

            </div>

          </div>

        </div>
      </div>
    </Layout>
  );
}
