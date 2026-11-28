import { useState, useEffect } from "react";
import {
  Smartphone,
  Send,
  CheckCircle2,
  Copy,
  Zap,
  Bot,
  Brain,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export function BankSMSAutomationCard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [testSMS, setTestSMS] = useState(
    "Paid Rs 50.00 to RAMESH KUMAR via UPI ref 433321... Bal: Rs 24,850"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [merchantRules, setMerchantRules] = useState<any[]>([]);
  const [rulesExpanded, setRulesExpanded] = useState(false);

  const webhookUrl = `${window.location.origin}/api/webhook/bank-sms`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: "Webhook Copied!",
      description: "URL copied to clipboard for your SMS Forwarder or n8n.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const loadRules = async () => {
    try {
      const res = await fetch("/api/merchant-rules");
      if (res.ok) {
        const data = await res.json();
        setMerchantRules(data.rules || []);
      }
    } catch (e) {
      console.warn("Could not load merchant rules:", e);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleTestParse = async () => {
    if (!testSMS.trim()) return;
    setIsLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/webhook/bank-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_sms: testSMS.trim() }),
      });

      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        toast({
          title: "Bank SMS Processed!",
          description: `Extracted ₹${data.parsed?.amount} for ${data.parsed?.merchant}.`,
        });
        loadRules();
      } else {
        toast({
          title: "Notice",
          description: data.message || "Could not parse as a bank SMS.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Simulation Failed",
        description: "Failed to connect to webhook endpoint.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCategory = async (expenseId: number, category: string, subType: string) => {
    try {
      const res = await fetch("/api/webhook/telegram/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: `cat:${category}:${subType}:${expenseId}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: "1-Tap Categorization Saved!",
          description: `Vendor "${data.merchant_learned}" is now remembered for future transactions.`,
        });
        loadRules();
        if (testResult) {
          setTestResult({
            ...testResult,
            requires_clarification: false,
            categorized_as: `${category.toUpperCase()} (${data.note})`,
          });
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not apply category.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await fetch(`/api/merchant-rules/${id}`, { method: "DELETE" });
      loadRules();
      toast({ title: "Rule Removed", description: "Learned vendor mapping deleted." });
    } catch (e) {
      toast({ title: "Error", description: "Could not delete rule." });
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Bank SMS & Telegram 1-Tap Sync
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                Live Webhook
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant ledger updates with Telegram 1-tap interactive categorization & vendor memory
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={copyWebhook}
          className="gap-1.5 text-xs font-semibold shrink-0"
        >
          {copied ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{copied ? "Copied!" : "Copy Webhook URL"}</span>
        </Button>
      </div>

      {/* Webhook endpoint box */}
      <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between text-xs font-mono">
        <span className="text-muted-foreground truncate">{webhookUrl}</span>
        <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase shrink-0 ml-2">
          POST
        </span>
      </div>

      {/* Simulator / Test Box */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Test Indian Bank SMS (Simulator)</span>
          </label>
          <span className="text-[10px] text-muted-foreground">Try Ramesh Kumar, Swiggy, or SBI</span>
        </div>

        <div className="flex gap-2">
          <Input
            value={testSMS}
            onChange={(e) => setTestSMS(e.target.value)}
            placeholder="Paste raw bank SMS here..."
            className="text-xs"
          />
          <Button
            onClick={handleTestParse}
            disabled={isLoading}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4"
          >
            {isLoading ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            <span>Parse & Sync</span>
          </Button>
        </div>

        {/* Test Result Card */}
        {testResult && (
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-border">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Extracted: ₹{testResult.parsed?.amount} to {testResult.parsed?.merchant}</span>
              </span>
              <span className="font-mono text-muted-foreground">
                Bal: ₹{testResult.matched_account?.balance?.toLocaleString() || "Updated"}
              </span>
            </div>

            {/* If needs 1-tap categorization */}
            {testResult.requires_clarification && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Bot className="w-4 h-4" />
                  <span>Unknown Personal Name! 1-Tap Telegram Prompt triggered:</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectCategory(testResult.record.id, "food", "office_tea")}
                    className="text-[11px] font-semibold h-8 bg-card hover:bg-muted"
                  >
                    ☕ Office Tea (₹50)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectCategory(testResult.record.id, "food", "meal")}
                    className="text-[11px] font-semibold h-8 bg-card hover:bg-muted"
                  >
                    🍔 Food & Dining
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectCategory(testResult.record.id, "transport", "auto")}
                    className="text-[11px] font-semibold h-8 bg-card hover:bg-muted"
                  >
                    🚗 Travel & Auto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectCategory(testResult.record.id, "shopping", "store")}
                    className="text-[11px] font-semibold h-8 bg-card hover:bg-muted"
                  >
                    🛍️ Shopping
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectCategory(testResult.record.id, "other", "split")}
                    className="text-[11px] font-semibold h-8 bg-card hover:bg-muted"
                  >
                    🤝 Friend Split
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectCategory(testResult.record.id, "utilities", "recharge")}
                    className="text-[11px] font-semibold h-8 bg-card hover:bg-muted"
                  >
                    ⚡ Utilities
                  </Button>
                </div>
              </div>
            )}

            {testResult.categorized_as && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                ✅ Saved as <strong>{testResult.categorized_as}</strong> and learned for future payments!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Learned Vendor Rules Accordion */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => setRulesExpanded(!rulesExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
        >
          <span className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            <span>Learned Contact & Vendor Memory ({merchantRules.length} saved)</span>
          </span>
          {rulesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {rulesExpanded && (
          <div className="mt-3 space-y-2">
            {merchantRules.length > 0 ? (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-muted/20">
                {merchantRules.map((rule) => (
                  <div key={rule.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{rule.merchant_keyword}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        ➔ {rule.category} {rule.note ? `(${rule.note})` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No custom vendor rules learned yet. They are created automatically when you categorize individual names!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
