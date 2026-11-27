import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Plus,
  RefreshCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  Trash2,
  Edit2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Server,
  Smartphone,
  Wifi,
  Bus,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RecurringBill {
  id: number;
  name: string;
  amount: number;
  category: string;
  due_day: number;
  account_name: string;
  is_paid_this_month: boolean;
  days_until_due: number;
  next_due_date: string;
  last_paid_date?: string;
  notes?: string;
}

const categoryIcons: Record<string, any> = {
  utilities: Wifi,
  transport: Bus,
  hosting: Server,
  mobile: Smartphone,
  entertainment: CreditCard,
};

export default function Bills() {
  const { toast } = useToast();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [totalCommitment, setTotalCommitment] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("utilities");
  const [dueDay, setDueDay] = useState("1");
  const [accountName, setAccountName] = useState("Current Bank Account");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payingBillId, setPayingBillId] = useState<number | null>(null);

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bills");
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
        setTotalCommitment(data.totalMonthlyCommitment || 0);
        setTotalPaid(data.totalPaidThisMonth || 0);
        setTotalPending(data.totalPendingThisMonth || 0);
      }
    } catch (err) {
      console.error("Error fetching bills:", err);
      toast({
        title: "Error",
        description: "Failed to load recurring bills",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) {
      alert("Please fill in bill name and amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount),
          category,
          due_day: parseInt(dueDay),
          account_name: accountName,
          notes: notes.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create bill");

      toast({
        title: "Bill Added! 📅",
        description: `Successfully added ${name} due on day ${dueDay} of each month.`,
      });

      setIsAddOpen(false);
      setName("");
      setAmount("");
      setNotes("");
      await fetchBills();
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not create recurring bill",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayBill = async (bill: RecurringBill) => {
    setPayingBillId(bill.id);
    try {
      const res = await fetch(`/api/bills/${bill.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_name: bill.account_name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      toast({
        title: "Bill Paid & Logged! ✅",
        description: data.message,
      });

      await fetchBills();
    } catch (err) {
      toast({
        title: "Payment Error",
        description: err instanceof Error ? err.message : "Error paying bill",
        variant: "destructive",
      });
    } finally {
      setPayingBillId(null);
    }
  };

  const handleDelete = async (id: number, billName: string) => {
    if (!confirm(`Are you sure you want to remove ${billName}?`)) return;

    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete bill");

      toast({
        title: "Bill Removed",
        description: `${billName} has been deleted.`,
      });
      await fetchBills();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                <CalendarCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                    Recurring Bills & Subscriptions
                  </h1>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Monthly Commitments
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  Track recurring obligations (VPS, Wi-Fi, Mobile, Commute) with due dates and 1-click payment logging
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBills}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={() => setIsAddOpen(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
              >
                <Plus className="w-4 h-4" />
                Add Bill
              </Button>
            </div>
          </div>

          {/* Monthly Commitment KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="rounded-3xl border border-border shadow-sm bg-card p-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Total Monthly Fixed Commitments
              </span>
              <h3 className="text-3xl font-extrabold text-foreground">
                ₹{totalCommitment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-muted-foreground mt-2">
                Across {bills.length} active recurring subscriptions
              </p>
            </Card>

            <Card className="rounded-3xl border border-emerald-200/80 shadow-sm bg-emerald-50/40 p-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  Paid This Month
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-extrabold text-emerald-950">
                ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-emerald-700 mt-2">
                Already debited & logged to expenses
              </p>
            </Card>

            <Card className="rounded-3xl border border-amber-200/80 shadow-sm bg-amber-50/40 p-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                  Pending To Pay
                </span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-3xl font-extrabold text-amber-950">
                ₹{totalPending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-amber-700 mt-2">
                Remaining due dates this month
              </p>
            </Card>
          </div>

          {/* Bills Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Your Recurring Subscriptions</h2>
              <span className="text-xs text-muted-foreground">Sorted by day of month</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bills.map((bill) => {
                const Icon = categoryIcons[bill.category] || CreditCard;
                return (
                  <div
                    key={bill.id}
                    className={cn(
                      "rounded-3xl p-6 border shadow-sm transition-all duration-300 flex flex-col justify-between gap-4 bg-card",
                      bill.is_paid_this_month
                        ? "border-emerald-200/70 bg-emerald-50/20"
                        : bill.days_until_due <= 3
                        ? "border-amber-300 bg-amber-50/30"
                        : "border-border hover:border-blue-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-lg">{bill.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                              Due on day {bill.due_day}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-blue-600 font-semibold">
                              {bill.account_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-foreground">₹{bill.amount.toLocaleString()}</p>
                        <span className="text-[10px] text-muted-foreground">Monthly</span>
                      </div>
                    </div>

                    {bill.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-muted/50">
                        {bill.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border/60">
                      <div>
                        {bill.is_paid_this_month ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Paid for this Month</span>
                          </div>
                        ) : bill.days_until_due <= 0 ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span>Due Today!</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                            <Clock className="w-4 h-4" />
                            <span>Due in {bill.days_until_due} days</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!bill.is_paid_this_month ? (
                          <Button
                            size="sm"
                            disabled={payingBillId === bill.id}
                            onClick={() => handlePayBill(bill)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold shadow-sm"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            {payingBillId === bill.id ? "Paying..." : "Pay & Log Expense"}
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            Next due: {new Date(bill.next_due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(bill.id, bill.name)}
                          className="text-slate-400 hover:text-red-600 h-8 w-8 p-0 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Bill Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Recurring Bill</DialogTitle>
            <DialogDescription>
              Set up a monthly fixed commitment to track its due date and payment status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBill} className="space-y-4 py-2">
            <div>
              <Label htmlFor="billName">Bill / Commitment Name</Label>
              <Input
                id="billName"
                placeholder="e.g. AIC Cloud VPS, Mobile Recharge, Wi-Fi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billAmt">Monthly Amount (₹)</Label>
                <Input
                  id="billAmt"
                  type="number"
                  placeholder="299"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="dueDay">Due Day of Month (1-31)</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="5"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billCat">Category</Label>
                <select
                  id="billCat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="utilities">Utilities & Internet</option>
                  <option value="transport">Transport & Commute</option>
                  <option value="rent">Rent & Housing</option>
                  <option value="entertainment">Entertainment & OTT</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="billAcc">Deduct From Account</Label>
                <select
                  id="billAcc"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="Current Bank Account">Current Bank Account</option>
                  <option value="Savings Bank Account">Savings Bank Account</option>
                  <option value="UPI">UPI Wallet</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="billNotes">Notes / Account Number (optional)</Label>
              <Input
                id="billNotes"
                placeholder="e.g. Consumer ID, Plan details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Recurring Bill"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
