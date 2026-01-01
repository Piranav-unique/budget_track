import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Target, DollarSign, Calendar, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Budget } from "@/lib/expenses";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import DonutChart from "@/components/DonutChart";
import CircularProgress from "@/components/CircularProgress";
import Slider from "@/components/Slider";
import { useAuth } from "@/hooks/use-auth";

function BudgetSettingsContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<Budget>({
    monthly: 2000,
    weekly: 500,
    savingsGoal: 500,
    income: 5000,
  });
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAIArchitectLoading, setIsAIArchitectLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ monthlySpend: number; savingsGoal: number; explanation: string } | null>(null);

  useEffect(() => {
    if (user) {
      const budgetKey = `budget_${user.id}`;
      const saved = localStorage.getItem(budgetKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setBudget({
            ...parsed,
            income: parsed.income || 5000,
            weekly: parsed.weekly || Math.round((parsed.monthly || 2000) / 4)
          });
        } catch (e) {
          console.error("Error loading budget:", e);
        }
      }
    }
  }, [user]);

  const handleAISuggest = async () => {
    if (!budget.income || budget.income <= 0) {
      alert("Please set your income first so the AI can suggest a budget.");
      return;
    }

    setIsAIArchitectLoading(true);
    try {
      const response = await fetch("/api/ai-insights/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ income: budget.income }),
      });

      if (!response.ok) throw new Error("Failed to get AI suggestion");

      const data = await response.json();
      if (data.success) {
        setAiSuggestion(data.suggestion);
      }
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsAIArchitectLoading(false);
    }
  };

  const applyAISuggestion = () => {
    if (aiSuggestion) {
      setBudget({
        ...budget,
        monthly: aiSuggestion.monthlySpend,
        savingsGoal: aiSuggestion.savingsGoal,
      });
      setAiSuggestion(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!budget.monthly || budget.monthly <= 0) {
      newErrors.monthly = "Monthly budget must be greater than 0";
    }

    // Weekly is auto-calculated now, but let's ensure it's > 0
    if (!budget.weekly || budget.weekly <= 0) {
      newErrors.monthly = "Monthly budget must be at least ₹10 to calculate weekly allowance";
    }

    if (!budget.savingsGoal || budget.savingsGoal <= 0) {
      newErrors.savingsGoal = "Savings goal must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // Ensure weekly is calculated from monthly
    const weeklyBudget = budget.monthly > 0 ? Math.round(budget.monthly / 4) : 0;

    const budgetToSave = {
      monthly: budget.monthly,
      weekly: weeklyBudget,
      savingsGoal: budget.savingsGoal || 0,
      income: budget.income || 0,
    };

    if (user) {
      const budgetKey = `budget_${user.id}`;
      localStorage.setItem(budgetKey, JSON.stringify(budgetToSave));
      // Trigger custom event for same-tab updates (storage event only fires in other tabs)
      window.dispatchEvent(new Event('budgetUpdated'));
      // Also trigger storage event for cross-tab updates
      window.dispatchEvent(new StorageEvent('storage', {
        key: budgetKey,
        newValue: JSON.stringify(budgetToSave)
      }));
    } else {
      localStorage.setItem("budget", JSON.stringify(budgetToSave));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (key: keyof Budget, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBudget((prev) => {
      const newBudget = {
        ...prev,
        [key]: numValue,
      };

      // Auto-calculate weekly when monthly changes
      if (key === "monthly") {
        newBudget.weekly = Math.round(numValue / 4);
      }

      return newBudget;
    });

    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium mb-4 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              Budget Settings
            </h1>
            <p className="text-lg text-muted-foreground mt-2 max-w-xl">
              Take control of your finances. Set your monthly income, spending limits, and savings goals to build a smarter future.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              className="h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              Save Changes
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-emerald-900 text-lg">
                Budget saved successfully!
              </p>
              <p className="text-emerald-700">
                Your new financial limits have been applied and will be tracked across your account.
              </p>
            </div>
          </div>
        )}

        {/* Overspending Alert */}
        {(budget.monthly + (budget.savingsGoal || 0)) > budget.income && (
          <div className="mb-6 animate-in slide-in-from-top duration-500">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <AlertTriangle className="w-16 h-16 text-red-500" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-red-900 font-bold mb-1">Budget Overspending Alert</h3>
                <p className="text-red-600 text-sm leading-relaxed">
                  Your combined spending (₹{budget.monthly.toLocaleString()}) and savings (₹{(budget.savingsGoal || 0).toLocaleString()}) exceed your monthly income by <span className="font-bold underline">₹{(budget.monthly + (budget.savingsGoal || 0) - budget.income).toLocaleString()}</span>. Please adjust your limits to stay within ₹{budget.income.toLocaleString()}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column - Inputs (8/12 width on desktop) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Monthly Income */}
            <div className="bg-white rounded-2xl border border-border shadow-md p-8 transition-all hover:shadow-lg">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Monthly Income
                  </h2>
                  <p className="text-muted-foreground">
                    How much money do you expect to receive this month?
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label
                    htmlFor="monthlyIncome"
                    className="text-lg font-bold text-foreground mb-4 block"
                  >
                    Your Monthly Income (₹)
                  </Label>
                  <Slider
                    value={budget.income || 0}
                    onChange={(value) => handleChange("income", value.toString())}
                    min={0}
                    max={10000}
                    step={50}
                    gradient={["#3b82f6", "#8b5cf6"]}
                    helperText="Include salary, pocket money, scholarships, or any other income source."
                    showInput={true}
                  />
                </div>
              </div>
            </div>

            {/* Monthly Spending */}
            <div className="bg-white rounded-2xl border border-border shadow-md p-8 transition-all hover:shadow-lg">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Target className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Spending Limit
                  </h2>
                  <p className="text-muted-foreground">
                    Set a maximum limit for your monthly expenses.
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <Label
                    htmlFor="monthly"
                    className="text-lg font-bold text-foreground mb-4 block"
                  >
                    Monthly Spending Budget (₹)
                  </Label>
                  <Slider
                    value={budget.monthly}
                    onChange={(value) => handleChange("monthly", value.toString())}
                    min={0}
                    max={budget.income || 10000}
                    step={10}
                    gradient={["#10b981", "#06b6d4"]}
                    helperText="Stay within this limit to maintain a healthy financial state."
                    error={errors.monthly}
                    showInput={true}
                  />
                </div>

                <div className="bg-[#f8fafc] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Weekly</p>
                    <p className="text-3xl font-bold text-blue-600">₹{(budget.weekly).toFixed(0)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Daily</p>
                    <p className="text-3xl font-bold text-blue-600">₹{(budget.monthly / 30).toFixed(0)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Hourly</p>
                    <p className="text-3xl font-bold text-blue-600">₹{(budget.monthly / (30 * 24)).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Goal */}
            <div className="bg-white rounded-2xl border border-border shadow-md p-8 transition-all hover:shadow-lg">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                  <Target className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Savings Goal
                  </h2>
                  <p className="text-muted-foreground">
                    How much would you like to put aside for the future?
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label
                    htmlFor="savingsGoal"
                    className="text-lg font-bold text-foreground mb-4 block"
                  >
                    Monthly Savings Target (₹)
                  </Label>
                  <Slider
                    value={budget.savingsGoal}
                    onChange={(value) => handleChange("savingsGoal", value.toString())}
                    min={0}
                    max={budget.income || 10000}
                    step={10}
                    gradient={["#8b5cf6", "#6366f1"]}
                    helperText="Consistent saving is the key to financial freedom."
                    error={errors.savingsGoal}
                    showInput={true}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons (Mobile only) */}
            <div className="flex lg:hidden gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save Budget
              </Button>
            </div>
          </div>

          {/* Right Column - Visualizations & Summary (4/12 width or sticky sidebar) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">

            {/* Visual Overview */}
            {budget.income > 0 && (
              <div className="bg-white rounded-2xl border border-border shadow-xl p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles className="w-20 h-20 text-primary" />
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
                  Live Analysis
                </h2>

                <div className="space-y-10">
                  {/* Donut Chart */}
                  <div className="flex justify-center scale-110 sm:scale-100">
                    <DonutChart
                      data={[
                        {
                          label: "Monthly Spending",
                          value: budget.monthly || 0,
                          color: "#10b981",
                          gradient: ["#10b981", "#06b6d4"],
                        },
                        {
                          label: "Savings Goal",
                          value: budget.savingsGoal || 0,
                          color: "#8b5cf6",
                          gradient: ["#8b5cf6", "#6366f1"],
                        },
                        {
                          label: "Available",
                          value: Math.max(0, budget.income - (budget.monthly || 0) - (budget.savingsGoal || 0)),
                          color: "#f59e0b",
                          gradient: ["#f59e0b", "#ef4444"],
                        },
                      ]}
                      size={240}
                      thickness={40}
                    />
                  </div>

                  {/* Circular Progress Row */}
                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-10">
                    <div className="flex flex-col items-center">
                      <CircularProgress
                        value={budget.monthly || 0}
                        max={budget.income}
                        size={110}
                        strokeWidth={10}
                        gradient={["#10b981", "#06b6d4"]}
                      />
                      <p className="text-sm font-bold text-foreground mt-3 uppercase tracking-tighter">Usage</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CircularProgress
                        value={budget.savingsGoal || 0}
                        max={budget.income}
                        size={110}
                        strokeWidth={10}
                        gradient={["#8b5cf6", "#6366f1"]}
                      />
                      <p className="text-sm font-bold text-foreground mt-3 uppercase tracking-tighter">Savings</p>
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className={cn(
                    "rounded-2xl p-6 transition-all",
                    ((budget.monthly || 0) + (budget.savingsGoal || 0)) <= budget.income * 0.9
                      ? "bg-emerald-50 border border-emerald-100"
                      : ((budget.monthly || 0) + (budget.savingsGoal || 0)) <= budget.income
                        ? "bg-amber-50 border border-amber-100"
                        : "bg-red-50 border border-red-100"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Budget Score</span>
                      <span className={cn(
                        "text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest text-white shadow-sm",
                        ((budget.monthly || 0) + (budget.savingsGoal || 0)) <= budget.income * 0.9
                          ? "bg-emerald-500"
                          : ((budget.monthly || 0) + (budget.savingsGoal || 0)) <= budget.income
                            ? "bg-amber-500"
                            : "bg-red-500"
                      )}>
                        {((budget.monthly || 0) + (budget.savingsGoal || 0)) <= budget.income * 0.9
                          ? "Excellent"
                          : ((budget.monthly || 0) + (budget.savingsGoal || 0)) <= budget.income
                            ? "Good"
                            : "Critical"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {((budget.monthly || 0) + (budget.savingsGoal || 0)) <= budget.income * 0.9
                        ? "Perfect! You're building a strong financial buffer."
                        : ((budget.monthly || 0) + (budget.savingsGoal || 0)) <= budget.income
                          ? "Steady progress. Try to optimize spending to save more."
                          : "Heads up! Your planned expenses and savings exceed your income."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Budget Architect */}
            <div className="bg-foreground text-background p-8 rounded-2xl shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-500" />

              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
                <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                AI Budget Architect
              </h3>

              {!aiSuggestion ? (
                <div className="space-y-4 relative z-10">
                  <p className="text-sm opacity-90 leading-relaxed">
                    Not sure how to allocate your money? Let our AI architect suggest an optimized plan based on your income.
                  </p>
                  <Button
                    onClick={handleAISuggest}
                    disabled={isAIArchitectLoading}
                    className="w-full h-12 bg-white text-foreground hover:bg-slate-100 transition-all font-bold shadow-lg shadow-white/10"
                  >
                    {isAIArchitectLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Analyzing...
                      </span>
                    ) : (
                      "Ask AI to Suggest"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 relative z-10 animate-in zoom-in-95 duration-300">
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-2">AI Suggestion</p>
                    <p className="text-sm italic opacity-90 mb-4 line-clamp-2">
                      "{aiSuggestion.explanation}"
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase opacity-60">Spending</p>
                        <p className="text-lg font-black text-white">₹{aiSuggestion.monthlySpend.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase opacity-60">Savings</p>
                        <p className="text-lg font-black text-white">₹{aiSuggestion.savingsGoal.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setAiSuggestion(null)}
                      variant="ghost"
                      className="flex-1 text-white hover:bg-white/10"
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={applyAISuggestion}
                      className="flex-2 bg-primary text-white hover:bg-primary/90 font-bold px-6"
                    >
                      Apply Now
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-slate-100/50 p-6 rounded-2xl border border-dashed border-slate-300 transition-hover hover:border-primary/50">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Quick Advice
              </h4>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">🎯</span>
                  Aim to save at least 20% of your income.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">🛡️</span>
                  Keep an emergency fund for unexpected costs.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BudgetSettings() {
  return (
    <Layout>
      <BudgetSettingsContent />
    </Layout>
  );
}
