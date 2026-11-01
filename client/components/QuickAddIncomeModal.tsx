import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Sparkles, Gift, Briefcase, TrendingUp, DollarSign, PartyPopper, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QuickAddIncomeModalProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const spotIncomeTypes = [
  { id: "bonus", label: "Bonus", icon: Gift, color: "bg-amber-100 text-amber-700 border-amber-200", defaultName: "Work / Performance Bonus" },
  { id: "freelance", label: "Freelance", icon: Briefcase, color: "bg-blue-100 text-blue-700 border-blue-200", defaultName: "Freelance Project" },
  { id: "gift", label: "Gift / Cash", icon: PartyPopper, color: "bg-pink-100 text-pink-700 border-pink-200", defaultName: "Gift from family/friends" },
  { id: "investment", label: "Investment", icon: TrendingUp, color: "bg-emerald-100 text-emerald-700 border-emerald-200", defaultName: "Dividend / Trading Returns" },
  { id: "spot", label: "Spot / Other", icon: Zap, color: "bg-purple-100 text-purple-700 border-purple-200", defaultName: "Spot Income / Cashback" },
];

const quickAmountPresets = [1000, 2000, 5000, 10000, 25000, 50000];

export function QuickAddIncomeModal({
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: QuickAddIncomeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (setControlledOpen || (() => {})) : setInternalOpen;

  const [selectedType, setSelectedType] = useState<string>("bonus");
  const [name, setName] = useState<string>("Work Bonus");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [addToMonthlyBudget, setAddToMonthlyBudget] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeSelect = (typeId: string, defaultName: string) => {
    setSelectedType(typeId);
    setName(defaultName);
    setError(null);
  };

  const handlePresetSelect = (presetAmt: number) => {
    setAmount(presetAmt.toString());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!name.trim()) {
      setError("Please provide a title for this income (e.g., 'Diwali Bonus')");
      return;
    }

    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid income amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Post to backend income endpoint
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: parsedAmount,
          frequency: "one-time",
          description: note.trim() || `Spot income: ${selectedType}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save income");
      }

      // 2. If 'Add directly to this month's budget' is enabled, update local budget
      if (addToMonthlyBudget) {
        const budgetKey = user ? `budget_${user.id}` : "budget";
        const saved = localStorage.getItem(budgetKey);
        if (saved) {
          try {
            const parsedBudget = JSON.parse(saved);
            const currentIncome = Number(parsedBudget.income || 0);
            const updatedBudget = {
              ...parsedBudget,
              income: currentIncome + parsedAmount,
            };
            localStorage.setItem(budgetKey, JSON.stringify(updatedBudget));
            window.dispatchEvent(new Event("budgetUpdated"));
          } catch (storageErr) {
            console.warn("Could not update local budget:", storageErr);
          }
        }
      }

      toast({
        title: "Spot Income Added! 🎉",
        description: `Successfully added ₹${parsedAmount.toLocaleString()} (${name}). Available budget updated.`,
      });

      // Reset fields
      setAmount("");
      setNote("");
      setError(null);
      setIsOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Error adding spot income:", err);
      setError(err instanceof Error ? err.message : "Failed to record spot income");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02]"
          >
            <Zap className="w-4 h-4" />
            <span>+ Quick Income</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Zap className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Add Spot Income / Bonus
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 text-xs">
            Log unexpected windfalls, freelance payouts, festival bonuses, or gifts in one click.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Income Type Selector Chips */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Type of Income</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {spotIncomeTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeSelect(type.id, type.defaultName)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all",
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-600"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Amount Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">Quick Amount Presets</Label>
              <span className="text-[11px] text-slate-400">Click to fill</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickAmountPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer",
                    amount === preset.toString()
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300"
                  )}
                >
                  +₹{preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label htmlFor="incomeAmount" className="text-xs font-semibold text-slate-700">
              Amount (₹) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                ₹
              </span>
              <Input
                id="incomeAmount"
                type="number"
                placeholder="5000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                className="pl-8 text-lg font-bold h-11"
                autoFocus
              />
            </div>
          </div>

          {/* Source / Description Input */}
          <div className="space-y-1.5">
            <Label htmlFor="incomeName" className="text-xs font-semibold text-slate-700">
              Source / Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="incomeName"
              placeholder="e.g. Diwali Performance Bonus, Logo Design"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="h-9 text-sm"
            />
          </div>

          {/* Date & Note Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="incomeDate" className="text-xs font-semibold text-slate-700">
                Date Received
              </Label>
              <Input
                id="incomeDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="incomeNote" className="text-xs font-semibold text-slate-700">
                Note (Optional)
              </Label>
              <Input
                id="incomeNote"
                placeholder="From client / company"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Toggle: Add to this month's budget */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg">
            <input
              id="addToBudget"
              type="checkbox"
              checked={addToMonthlyBudget}
              onChange={(e) => setAddToMonthlyBudget(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="addToBudget" className="text-xs text-slate-700 cursor-pointer select-none">
              <span className="font-semibold text-emerald-900">Increase this month's budget</span>
              <p className="text-[11px] text-slate-500">
                Automatically adds ₹{amount ? Number(amount).toLocaleString() : "0"} to your total available budget.
              </p>
            </label>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold"
            >
              {isSubmitting ? "Saving..." : "Add Income"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
