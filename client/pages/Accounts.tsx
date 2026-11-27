import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Landmark,
  CreditCard,
  ArrowRightLeft,
  Plus,
  CheckCircle2,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  Sparkles,
  Trash2,
  Edit3,
  ShieldCheck,
  ChevronRight,
  Coins,
  Smartphone,
  Info,
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
import { BankAccount, AccountTransfer } from "@/types/account";

const accountTypeConfig: Record<string, { label: string; icon: any; color: string; gradient: string }> = {
  current: {
    label: "Current Account",
    icon: Building2,
    color: "text-blue-500",
    gradient: "from-slate-900 via-blue-950 to-indigo-950 text-white border-blue-500/30",
  },
  savings: {
    label: "Savings Account",
    icon: Landmark,
    color: "text-emerald-500",
    gradient: "from-emerald-950 via-teal-900 to-slate-900 text-white border-emerald-500/30",
  },
  upi: {
    label: "UPI Wallet",
    icon: Smartphone,
    color: "text-purple-500",
    gradient: "from-purple-950 via-indigo-900 to-slate-900 text-white border-purple-500/30",
  },
  cash: {
    label: "Cash in Hand",
    icon: Coins,
    color: "text-amber-500",
    gradient: "from-amber-950 via-yellow-900 to-slate-900 text-white border-amber-500/30",
  },
  credit_card: {
    label: "Credit Card",
    icon: CreditCard,
    color: "text-rose-500",
    gradient: "from-rose-950 via-pink-900 to-slate-900 text-white border-rose-500/30",
  },
};

export default function Accounts() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  // Add Account Form State
  const [newName, setNewName] = useState("");
  const [newBankName, setNewBankName] = useState("HDFC Bank");
  const [newType, setNewType] = useState<"current" | "savings" | "upi" | "cash">("current");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transfer Form State
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferNote, setTransferNote] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Adjust Balance State
  const [adjustedBalance, setAdjustedBalance] = useState<string>("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [accRes, transRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/accounts/transfers"),
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
        setTotalBalance(accData.totalBalance || 0);

        if (accData.accounts?.length > 1 && !fromAccountId) {
          setFromAccountId(accData.accounts[0].id.toString());
          setToAccountId(accData.accounts[1].id.toString());
        }
      }

      if (transRes.ok) {
        const transData = await transRes.json();
        setTransfers(transData.transfers || []);
      }
    } catch (err) {
      console.error("Error loading accounts:", err);
      toast({
        title: "Error",
        description: "Failed to load bank accounts. Please refresh.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert("Please enter an account name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          bank_name: newBankName.trim(),
          type: newType,
          account_number: newAccountNumber.trim() || `•• ${Math.floor(1000 + Math.random() * 9000)}`,
          balance: parseFloat(newBalance) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create account");
      }

      toast({
        title: "Bank Account Added!",
        description: `Successfully added ${newName}.`,
      });

      setIsAddOpen(false);
      setNewName("");
      setNewAccountNumber("");
      setNewBalance("");
      await fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    if (fromAccountId === toAccountId) {
      alert("Source and destination accounts must be different");
      return;
    }

    setIsTransferring(true);
    try {
      const res = await fetch("/api/accounts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: parseInt(fromAccountId),
          toAccountId: parseInt(toAccountId),
          amount: amt,
          note: transferNote.trim() || "Account Transfer",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      toast({
        title: "Transfer Successful! 💸",
        description: data.message,
      });

      setIsTransferOpen(false);
      setTransferAmount("");
      setTransferNote("");
      await fetchData();
    } catch (err) {
      toast({
        title: "Transfer Failed",
        description: err instanceof Error ? err.message : "Error transferring money",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedAccount) return;
    const newBal = parseFloat(adjustedBalance);
    if (isNaN(newBal) || newBal < 0) {
      alert("Please enter a valid non-negative balance");
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: newBal }),
      });

      if (!res.ok) throw new Error("Failed to update balance");

      toast({
        title: "Balance Calibrated! ✅",
        description: `${selectedAccount.name} balance updated to ₹${newBal.toLocaleString()}`,
      });

      setIsAdjustOpen(false);
      setSelectedAccount(null);
      await fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update balance",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");

      toast({
        title: "Account Removed",
        description: `${name} has been removed.`,
      });
      await fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to remove account",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <Landmark className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                    Bank Accounts & Wallets
                  </h1>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    Live Ledger
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage your Current Bank Account, Savings, UPI, and track real-time balances
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={() => setIsTransferOpen(true)}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Transfer Money
              </Button>
              <Button
                onClick={() => setIsAddOpen(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </div>
          </div>

          {/* Net Worth / Total Balance Hero Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck className="w-56 h-56 text-blue-400" />
            </div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Total Liquid Net Balance
                </span>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                  ₹{totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-slate-400 text-xs">
                  Aggregated across all {accounts.length} linked bank & cash accounts
                </p>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800 md:pl-8">
                {accounts.map((acc) => {
                  const cfg = accountTypeConfig[acc.type] || accountTypeConfig.current;
                  const Icon = cfg.icon;
                  return (
                    <div key={acc.id} className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        <span className="truncate">{acc.name}</span>
                      </div>
                      <p className="font-bold text-white text-base truncate">
                        ₹{acc.balance.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {acc.is_primary ? "⭐ Primary" : acc.account_number || "Active"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Account Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Your Bank Accounts & Wallets</h2>
                <p className="text-xs text-muted-foreground">Select any card to adjust balance or transfer</p>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {accounts.length} Active Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {accounts.map((account) => {
                const cfg = accountTypeConfig[account.type] || accountTypeConfig.current;
                const Icon = cfg.icon;

                return (
                  <div
                    key={account.id}
                    className={cn(
                      "rounded-3xl p-6 shadow-xl border relative overflow-hidden flex flex-col justify-between min-h-[220px] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl bg-gradient-to-br",
                      cfg.gradient
                    )}
                  >
                    {/* Background Decorative Rings */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
                    <div className="absolute -left-10 -top-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

                    {/* Top Row: Bank Name & Chip */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-white/80" />
                          <span className="font-bold text-sm tracking-wide text-white/90 uppercase">
                            {account.bank_name || "Bank Account"}
                          </span>
                        </div>
                        {account.is_primary && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40">
                            Primary
                          </span>
                        )}
                      </div>

                      {/* EMV Chip & Account Number */}
                      <div className="flex items-center justify-between text-xs text-white/70 mb-6 font-mono">
                        <div className="w-8 h-6 rounded bg-amber-400/30 border border-amber-300/40 flex items-center justify-center">
                          <div className="w-5 h-3 border-t border-b border-amber-300/60" />
                        </div>
                        <span>{account.account_number || "•••• •••• •••• 1234"}</span>
                      </div>
                    </div>

                    {/* Balance & Actions */}
                    <div>
                      <div className="mb-4">
                        <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold block">
                          Available Balance
                        </span>
                        <h3 className="text-3xl font-extrabold text-white tracking-tight">
                          ₹{account.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-white/80 mt-0.5 font-medium">{account.name}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account);
                            setAdjustedBalance(account.balance.toString());
                            setIsAdjustOpen(true);
                          }}
                          className="text-xs text-white/80 hover:text-white hover:bg-white/15 h-8 px-2.5 rounded-xl gap-1.5 flex-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Adjust
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFromAccountId(account.id.toString());
                            setIsTransferOpen(true);
                          }}
                          className="text-xs text-white/80 hover:text-white hover:bg-white/15 h-8 px-2.5 rounded-xl gap-1.5 flex-1"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                        </Button>
                        {!account.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(account.id, account.name)}
                            className="text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 h-8 px-2 rounded-xl"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transfers History */}
          <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Recent Transfers</h3>
                  <p className="text-xs text-muted-foreground">Internal movements between your bank accounts</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferOpen(true)}
                className="gap-2"
              >
                + New Transfer
              </Button>
            </div>

            {transfers.length > 0 ? (
              <div className="divide-y divide-border">
                {transfers.slice(0, 10).map((t) => (
                  <div key={t.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {t.from_account_name} ➔ {t.to_account_name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.note || "Transfer"} • {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">₹{Number(t.amount).toLocaleString()}</p>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No transfers recorded yet.</p>
                <p className="text-xs mt-1">Use the "Transfer Money" button to move funds between your accounts.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Bank Account Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bank Account / Wallet</DialogTitle>
            <DialogDescription>
              Link a new Current Account, Savings Account, UPI, or Cash wallet.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAccount} className="space-y-4 py-2">
            <div>
              <Label htmlFor="accName">Account Label</Label>
              <Input
                id="accName"
                placeholder="e.g. HDFC Salary Account, Business Current"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank / Provider</Label>
                <Input
                  id="bankName"
                  placeholder="e.g. HDFC, SBI, ICICI, GPay"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="accType">Account Type</Label>
                <select
                  id="accType"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="current">Current Account</option>
                  <option value="savings">Savings Account</option>
                  <option value="upi">UPI Wallet</option>
                  <option value="cash">Cash in Hand</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accNum">Masked A/C (optional)</Label>
                <Input
                  id="accNum"
                  placeholder="e.g. •• 4912"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="accBal">Current Balance (₹)</Label>
                <Input
                  id="accBal"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Bank Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Money Modal */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Money Between Accounts</DialogTitle>
            <DialogDescription>
              Move balance between your accounts (e.g. Current Account ➔ Savings).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransfer} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromAcc">From Account</Label>
                <select
                  id="fromAcc"
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (₹{a.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="toAcc">To Account</Label>
                <select
                  id="toAcc"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (₹{a.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="transferAmt">Transfer Amount (₹)</Label>
              <Input
                id="transferAmt"
                type="number"
                placeholder="5000"
                step="0.01"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="transNote">Note / Reason (optional)</Label>
              <Input
                id="transNote"
                placeholder="e.g. Monthly savings deposit, Cash withdrawal"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isTransferring} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isTransferring ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Balance Modal */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Calibrate Balance</DialogTitle>
            <DialogDescription>
              Update the real-time balance for {selectedAccount?.name} to match your net banking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="adjBal">Actual Balance in Account (₹)</Label>
              <Input
                id="adjBal"
                type="number"
                step="0.01"
                value={adjustedBalance}
                onChange={(e) => setAdjustedBalance(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustBalance}>Save Balance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
