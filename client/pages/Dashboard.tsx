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
  Zap,
  Briefcase,
  Building2,
  CheckCircle2,
  Landmark,
  ArrowRightLeft,
  CreditCard,
  ShieldCheck,
  Layers,
  FileText,
  PieChart,
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
import { AIInsights } from "@/components/AIInsights";
import { QuickAddIncomeModal } from "@/components/QuickAddIncomeModal";
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
  const [isLoggingCorporate, setIsLoggingCorporate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [budget, setBudget] = useState<Budget>({
    monthly: 0,
    weekly: 0,
    savingsGoal: 0,
    income: 0,
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

  // AI Insights hook
  const {
    insights,
    loading: insightsLoading,
    error: insightsError,
    lastUpdated,
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

      if (!res.ok) {
        throw new Error("Failed to log corporate spend");
      }

      await fetchExpenses();
      await fetchAccounts();
      toast({
        title: "🏢 Corporate Spend Logged!",
        description: "Recorded ₹50 daily office spend charged to Current Bank Account.",
      });
    } catch (err) {
      console.error("Corporate log error:", err);
      toast({
        title: "Error",
        description: "Failed to log ₹50 expense. Please try again.",
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
        title: "📥 Export Started",
        description: "Your full financial ledger is downloading as a CSV spreadsheet.",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Could not export ledger CSV.",
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
          const shouldUpdatePiranavIncome =
            isPiranavUser(user) && localStorage.getItem(PIRANAV_INCOME_UPDATE_KEY) !== "true";
          if (shouldUpdatePiranavIncome) {
            parsed.income = 0;
            localStorage.setItem(budgetKey, JSON.stringify(parsed));
            localStorage.setItem(PIRANAV_INCOME_UPDATE_KEY, "true");
          }
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
    fetchAccounts();
    const interval = setInterval(() => {
      fetchExpenses();
      fetchAccounts();
    }, 10000);

    loadBudget();

    const handleStorageChange = () => {
      loadBudget();
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("budgetUpdated", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("budgetUpdated", handleStorageChange);
    };
  }, [user]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - now.getDate());

  const monthlySpent = getTotalSpent(expenses, monthStart, monthEnd);
  const monthlyRemaining = budget.monthly - monthlySpent;
  const monthlyProgress = budget.monthly > 0 ? (monthlySpent / budget.monthly) * 100 : 0;
  const dailySafeSpend = Math.max(0, Math.round(monthlyRemaining / daysRemainingInMonth));

  // Liquid Net Worth (Sum of all bank accounts)
  const totalLiquidNetWorth = bankAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

  // Top categories
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.date >= monthStart && e.date <= monthEnd) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([cat, amount]) => ({
      category: cat as ExpenseCategory,
      amount,
    }));

  // Corporate Spend Calculations
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

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
  const daysLoggedThisMonth = monthlyCorporateExpenses.length;

  // Filtered expenses for search & category
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
      <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-5 md:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* 🌟 1. PREMIER EXECUTIVE HERO COMMAND BAR */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/20 p-5 md:p-7 shadow-2xl backdrop-blur-xl">
            {/* Ambient background glows */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              {/* Left Identity Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/30">
                      PM
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-sm" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        Executive Financial Suite
                      </h1>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-widest">
                        Aptean Edition
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm font-medium flex items-center gap-2 mt-0.5">
                      <span>Welcome back, <strong className="text-slate-200">Piranav</strong></span>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Multi-Bank Ledger
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Action Command Center */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search expenses, banks..."
                    className="w-full sm:w-48 md:w-56 pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>

                {/* Spot Income Modal */}
                <QuickAddIncomeModal
                  trigger={
                    <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 rounded-xl px-4 py-2 font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer">
                      <Zap className="w-4 h-4 text-emerald-200" />
                      <span>+ Quick Income</span>
                    </Button>
                  }
                  onSuccess={() => {
                    loadBudget();
                    fetchExpenses();
                    fetchAccounts();
                  }}
                />

                {/* Add Expense Button */}
                <Link to="/add-expense">
                  <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 rounded-xl px-4 py-2 font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>Add Expense</span>
                  </Button>
                </Link>

                {/* CSV Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="gap-2 bg-slate-900/80 border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchExpenses();
                    fetchAccounts();
                    refreshInsights();
                    toast({ title: "Refreshed", description: "Latest ledger and AI insights re-synced." });
                  }}
                  className="bg-slate-900/80 border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl p-2 sm:px-3 text-xs"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* 💎 2. PREMIER EXECUTIVE METRIC CARDS (4-COLUMN GRID) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">

            {/* CARD 1: LIQUID NET WORTH & MULTI-BANK TOTAL */}
            <Card className="border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl shadow-xl overflow-hidden relative group hover:border-blue-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Landmark className="w-24 h-24 text-blue-400" />
              </div>
              <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-blue-400" /> Total Liquid Net Worth
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-400/20">
                      4 Accounts
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    ₹{totalLiquidNetWorth.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real-time Multi-Bank Balance</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span>Current:</span>
                    <strong className="text-slate-200">
                      ₹{Number(bankAccounts.find((a) => a.type === "current")?.balance || 25000).toLocaleString()}
                    </strong>
                  </div>
                  <Link to="/accounts" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                    Transfer <ArrowRightLeft className="w-3 h-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: MONTHLY BUDGET & VELOCITY RUNWAY */}
            <Card className="border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl shadow-xl overflow-hidden relative group hover:border-emerald-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet className="w-24 h-24 text-emerald-400" />
              </div>
              <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Available Budget
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase",
                        monthlyRemaining < 0
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}
                    >
                      {monthlyRemaining < 0 ? "Over Budget" : `${monthlyProgress.toFixed(0)}% Used`}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    ₹{monthlyRemaining.toLocaleString()}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    of ₹{budget.monthly.toLocaleString()} monthly limit
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        monthlyProgress > 100
                          ? "bg-gradient-to-r from-red-500 to-rose-600"
                          : monthlyProgress > 80
                          ? "bg-gradient-to-r from-amber-500 to-orange-500"
                          : "bg-gradient-to-r from-emerald-500 to-teal-400"
                      )}
                      style={{ width: `${Math.min(monthlyProgress, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Runway: <strong className="text-emerald-300">₹{dailySafeSpend}/day</strong></span>
                    <span>{daysRemainingInMonth} days left</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: CORPORATE SPEND & APTEAN ALLOWANCE */}
            <Card className="border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl shadow-xl overflow-hidden relative group hover:border-indigo-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 className="w-24 h-24 text-indigo-400" />
              </div>
              <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Corporate Allowance
                    </span>
                    {isCorporateLoggedToday ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Logged
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" /> Due Today
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    ₹50 <span className="text-xs font-normal text-slate-400">/ day</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Monthly logged: <strong className="text-indigo-300">₹{monthlyCorporateTotal}</strong> ({daysLoggedThisMonth} days)
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleQuickLogCorporate50}
                    disabled={isLoggingCorporate}
                    size="sm"
                    className={cn(
                      "w-full rounded-xl font-bold text-xs py-2 shadow-sm transition-all cursor-pointer",
                      isCorporateLoggedToday
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-500/25"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    {isLoggingCorporate
                      ? "Logging..."
                      : isCorporateLoggedToday
                      ? "+ Log Extra ₹50"
                      : "⚡ Log Today's ₹50"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CARD 4: GROQ AI FINANCIAL COPILOT */}
            <Card className="border border-purple-500/30 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 rounded-2xl shadow-xl overflow-hidden relative group hover:border-purple-400/60 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-24 h-24 text-purple-400" />
              </div>
              <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full space-y-4 text-white">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> AI Copilot
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                      Llama 3.3
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 line-clamp-1">
                    {insightsLoading ? "Analyzing financial trends..." : insights[0]?.title || "Budget Optimized"}
                  </h4>
                  <p className="text-xs text-purple-200/80 mt-1 line-clamp-2 leading-relaxed">
                    {insightsLoading
                      ? "AI is evaluating your multi-bank transactions..."
                      : insights[0]?.message || "Your spending velocity is within healthy corporate limits."}
                  </p>
                </div>

                <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-purple-300/70">
                    {insights.length} recommendations
                  </span>
                  <button
                    onClick={refreshInsights}
                    className="text-purple-300 hover:text-white font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RefreshCcw className="w-3 h-3" /> Refresh
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 🏦 3. PREMIER MULTI-BANK ACCOUNT HUB (INTERACTIVE CARDS) */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-7 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    Linked Bank Accounts & Live Wallets
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live balance synchronization across Current, Savings, UPI, and Cash
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/accounts">
                  <Button variant="outline" size="sm" className="gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" /> Inter-Account Transfer
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bank Account Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {bankAccounts.map((acc) => {
                const isCurrent = acc.type === "current";
                const isSavings = acc.type === "savings";
                const isUPI = acc.type === "upi";

                return (
                  <Link
                    key={acc.id}
                    to="/accounts"
                    className="p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/50 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-850 hover:to-slate-900 transition-all duration-300 group shadow-md hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden"
                  >
                    {/* Top indicator strip */}
                    <div
                      className={cn(
                        "absolute top-0 left-0 right-0 h-1",
                        isCurrent
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                          : isSavings
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                          : isUPI
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gradient-to-r from-amber-500 to-orange-500"
                      )}
                    />

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors truncate">
                        {acc.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
                        {acc.account_number || "•••"}
                      </span>
                    </div>

                    <p className="text-2xl font-black text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                      ₹{Number(acc.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span className="capitalize">{acc.bank_name || acc.type}</span>
                      <span className="text-indigo-400 group-hover:translate-x-1 transition-transform font-bold flex items-center gap-1">
                        View ➔
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 📊 4. MAIN CONTENT SPLIT: TRANSACTIONS & TOP SPENDING */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left 2 Cols: Recent Transactions with Filter */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                      <Clock className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                      <p className="text-xs text-slate-400">Verified multi-bank transaction ledger</p>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {["all", "food", "transport", "shopping", "utilities"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-medium transition-all capitalize cursor-pointer",
                          selectedCategoryFilter === cat
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transactions List */}
                {filteredExpenses.length > 0 ? (
                  <div className="divide-y divide-slate-800/80">
                    {filteredExpenses.slice(0, 7).map((expense) => (
                      <div
                        key={expense.id}
                        className="py-3.5 hover:bg-slate-800/40 px-2 rounded-xl transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">
                            {categoryEmojis[expense.category] || "📌"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm truncate">
                              {expense.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="capitalize text-slate-300">{expense.category}</span>
                              <span>•</span>
                              <span>{expense.date.toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                                {expense.source || "Current Bank Account"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right pl-3 shrink-0">
                          <p className="font-black text-white text-sm group-hover:text-rose-400 transition-colors">
                            -₹{expense.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                      <Wallet className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">No transactions found</p>
                    <p className="text-xs text-slate-500">Try adjusting your search or category filter</p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Showing {Math.min(filteredExpenses.length, 7)} of {filteredExpenses.length} transactions</span>
                  <Link to="/analytics" className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1">
                    View Analytics Report <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Top Spending & Quick Actions */}
            <div className="space-y-6">

              {/* Top Categories */}
              <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-400" />
                    Category Allocation
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">This Month</span>
                </div>

                {sortedCategories.length > 0 ? (
                  <div className="space-y-4">
                    {sortedCategories.map((item) => {
                      const pct = monthlySpent > 0 ? Math.round((item.amount / monthlySpent) * 100) : 0;
                      return (
                        <div key={item.category} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium capitalize flex items-center gap-1.5">
                              <span>{categoryEmojis[item.category]}</span> {item.category}
                            </span>
                            <span className="font-bold text-white">
                              ₹{item.amount.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Category distribution will appear as you spend.
                  </p>
                )}
              </div>

              {/* Executive Shortcuts Box */}
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-5 md:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" /> Executive Shortcuts
                  </h4>
                  <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                    Fast Access
                  </span>
                </div>

                <div className="space-y-2.5">
                  <Link to="/budget">
                    <Button variant="outline" className="w-full justify-between bg-slate-900/60 border-slate-700/80 hover:bg-slate-800 text-slate-200 text-xs py-5 rounded-xl group">
                      <span className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-400" /> Adjust Monthly Budget
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Button>
                  </Link>

                  <Link to="/accounts">
                    <Button variant="outline" className="w-full justify-between bg-slate-900/60 border-slate-700/80 hover:bg-slate-800 text-slate-200 text-xs py-5 rounded-xl group">
                      <span className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Manage Bank Balances
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Button>
                  </Link>

                  <Link to="/analytics">
                    <Button variant="outline" className="w-full justify-between bg-slate-900/60 border-slate-700/80 hover:bg-slate-800 text-slate-200 text-xs py-5 rounded-xl group">
                      <span className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-purple-400" /> Financial Analytics & Trends
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>

            </div>
          </div>

          {/* 🧠 5. AI FINANCIAL INTELLIGENCE DECK */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-7 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    AI Financial Intelligence Deck
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      Live Groq AI
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Personalized recommendations for Aptean corporate & daily spends</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={refreshInsights}
                className="gap-1.5 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
              >
                <RefreshCcw className="w-3 h-3" /> Re-Analyze
              </Button>
            </div>

            <AIInsights
              insights={insights}
              loading={insightsLoading}
              error={insightsError}
              lastUpdated={lastUpdated}
              onRefresh={refreshInsights}
              compact={false}
            />
          </div>

        </div>
      </div>
    </Layout>
  );
}
