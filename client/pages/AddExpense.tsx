import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { ExpenseCategory, categoryEmojis } from "@/lib/expenses";

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

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
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
        throw new Error(data.error || "Failed to save expense");
      }

      navigate("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save expense";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Add New Expense
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your spending and get automatic categorization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
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
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
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

            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
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

          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
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
                      : "border-border bg-white text-foreground hover:border-primary/50",
                  )}
                >
                  <span className="text-xl">{categoryEmojis[cat]}</span>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
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
              {isSubmitting ? "Saving..." : "Add Expense"}
            </Button>
          </div>
        </form>
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
