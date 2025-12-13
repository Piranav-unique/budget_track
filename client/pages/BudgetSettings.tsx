import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Target, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Budget } from "@/lib/expenses";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";

function BudgetSettingsContent() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState<Budget>({
    monthly: 2000,
    weekly: 500,
    savingsGoal: 500,
  });
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem("budget");
    if (saved) {
      try {
        setBudget(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading budget:", e);
      }
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!budget.monthly || budget.monthly <= 0) {
      newErrors.monthly = "Monthly budget must be greater than 0";
    }
    if (!budget.weekly || budget.weekly <= 0) {
      newErrors.weekly = "Weekly budget must be greater than 0";
    }
    if (!budget.savingsGoal || budget.savingsGoal <= 0) {
      newErrors.savingsGoal = "Savings goal must be greater than 0";
    }
    if (budget.weekly > budget.monthly) {
      newErrors.weekly = "Weekly budget cannot exceed monthly budget";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    localStorage.setItem("budget", JSON.stringify(budget));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (key: keyof Budget, value: string) => {
    setBudget((prev) => ({
      ...prev,
      [key]: parseFloat(value) || 0,
    }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const monthlyRecommended = budget.monthly / 4;
  const weeklyFromMonthly = (budget.monthly * 0.87) / 4; // Rough weekly based on month

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Budget Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Set your budget limits and savings goals to stay on track
          </p>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 bg-secondary/10 border border-secondary/20 rounded-lg p-4 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-secondary mt-2" />
            <div>
              <p className="font-semibold text-secondary">Budget saved successfully!</p>
              <p className="text-sm text-secondary/80">Your budget limits have been updated.</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Monthly Budget */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Monthly Budget</h2>
                <p className="text-sm text-muted-foreground">Your total spending limit for the month</p>
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="monthly" className="text-base font-semibold text-foreground mb-3 block">
                Monthly Spending Limit
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  $
                </span>
                <Input
                  id="monthly"
                  type="number"
                  placeholder="2000"
                  value={budget.monthly}
                  onChange={(e) => handleChange("monthly", e.target.value)}
                  step="100"
                  min="0"
                  className={cn(
                    "text-lg py-6 pl-8",
                    errors.monthly && "border-destructive"
                  )}
                />
              </div>
              {errors.monthly && (
                <p className="text-sm text-destructive mt-2">{errors.monthly}</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Recommended allocation:</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Weekly</p>
                  <p className="text-lg font-bold text-primary">${(budget.monthly / 4).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Bi-weekly</p>
                  <p className="text-lg font-bold text-primary">${(budget.monthly / 2).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Daily</p>
                  <p className="text-lg font-bold text-primary">${(budget.monthly / 30).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Budget */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Weekly Budget</h2>
                <p className="text-sm text-muted-foreground">Your spending limit per week</p>
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="weekly" className="text-base font-semibold text-foreground mb-3 block">
                Weekly Spending Limit
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  $
                </span>
                <Input
                  id="weekly"
                  type="number"
                  placeholder="500"
                  value={budget.weekly}
                  onChange={(e) => handleChange("weekly", e.target.value)}
                  step="50"
                  min="0"
                  className={cn(
                    "text-lg py-6 pl-8",
                    errors.weekly && "border-destructive"
                  )}
                />
              </div>
              {errors.weekly && (
                <p className="text-sm text-destructive mt-2">{errors.weekly}</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Monthly equivalent:</p>
              <p className="text-lg font-bold text-secondary">${(budget.weekly * 4.33).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                (Your monthly budget is ${budget.monthly.toFixed(2)})
              </p>
            </div>
          </div>

          {/* Savings Goal */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Savings Goal</h2>
                <p className="text-sm text-muted-foreground">How much you want to save monthly</p>
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="savingsGoal" className="text-base font-semibold text-foreground mb-3 block">
                Monthly Savings Target
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  $
                </span>
                <Input
                  id="savingsGoal"
                  type="number"
                  placeholder="500"
                  value={budget.savingsGoal}
                  onChange={(e) => handleChange("savingsGoal", e.target.value)}
                  step="50"
                  min="0"
                  className={cn(
                    "text-lg py-6 pl-8",
                    errors.savingsGoal && "border-destructive"
                  )}
                />
              </div>
              {errors.savingsGoal && (
                <p className="text-sm text-destructive mt-2">{errors.savingsGoal}</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly savings target:</p>
                <p className="text-lg font-bold text-accent">${budget.savingsGoal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Yearly savings projection:</p>
                <p className="text-lg font-bold text-accent">${(budget.savingsGoal * 12).toFixed(2)}</p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  You'll need to spend ${(budget.monthly - budget.savingsGoal).toFixed(2)} or less each month to reach this goal.
                </p>
              </div>
            </div>
          </div>

          {/* Budget Tips */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/20 p-6">
            <h3 className="font-bold text-foreground mb-3">💡 Budget Tips</h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li>• Set realistic budgets based on your actual income</li>
              <li>• Allocate 50% for needs, 30% for wants, 20% for savings</li>
              <li>• Review your budget monthly and adjust as needed</li>
              <li>• Track expenses regularly to stay within your limits</li>
              <li>• Build an emergency fund for unexpected expenses</li>
            </ul>
          </div>

          {/* Action Buttons */}
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
              type="button"
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Save Budget
            </Button>
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
