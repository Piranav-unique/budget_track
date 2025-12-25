import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  User,
  Bell,
  Moon,
  Shield,
  FileDown,
  ChevronRight,
  LogOut,
  Wallet,
  HelpCircle,
  Mail,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useToast } from "@/components/ui/use-toast";

function SettingsContent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to fetch data");

      const data = await res.json();

      // Convert to CSV
      const headers = ["Date", "Description", "Category", "Amount", "Note"];
      const csvContent = [
        headers.join(","),
        ...data.map((row: any) => {
          const date = new Date(row.date ?? row.createdAt).toISOString().split('T')[0];
          const description = `"${(row.description || "").replace(/"/g, '""')}"`;
          const note = `"${(row.note || "").replace(/"/g, '""')}"`;
          return [
            date,
            description,
            row.category,
            row.amount,
            note
          ].join(",");
        })
      ].join("\n");

      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `money_track_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "Your expenses have been downloaded as a CSV file.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Could not download your data using the API.",
      });
    } finally {
      setLoading(false);
    }
  };

  const SettingGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        {title}
      </h3>
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );

  const SettingItem = ({
    icon: Icon,
    label,
    subLabel,
    action,
    onClick,
    destructive = false
  }: {
    icon: any,
    label: string,
    subLabel?: string,
    action?: React.ReactNode,
    onClick?: () => void,
    destructive?: boolean
  }) => (
    <div
      onClick={onClick}
      className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${destructive ? 'bg-red-50 text-red-500' : 'bg-primary/5 text-primary'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className={`font-medium ${destructive ? 'text-destructive' : 'text-foreground'}`}>
            {label}
          </p>
          {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
        </div>
      </div>
      {action || (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />)}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your preferences</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl p-6 border border-border shadow-sm flex items-center gap-4 mb-8">
          <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
            <AvatarImage src="/avatar-placeholder.png" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-xl">
              P
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Piranav</h2>
            <p className="text-muted-foreground text-sm">piranav@example.com</p>
          </div>
          <Button variant="outline" size="sm">Edit Profile</Button>
        </div>

        {/* Finance Settings */}
        <SettingGroup title="Finances">
          <Link to="/budget">
            <SettingItem
              icon={Wallet}
              label="Budget & Goals"
              subLabel="Manage monthly limits and savings"
            />
          </Link>
          <SettingItem
            icon={FileDown}
            label="Export Data"
            subLabel="Download all transactions as CSV"
            onClick={handleExport}
            action={loading ? <span className="text-xs text-muted-foreground">Exporting...</span> : null}
          />
        </SettingGroup>

        {/* App Settings */}
        <SettingGroup title="Preferences">
          <SettingItem
            icon={Bell}
            label="Notifications"
            action={
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            }
          />
          <SettingItem
            icon={Moon}
            label="Dark Mode"
            action={
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            }
          />
          <SettingItem
            icon={Smartphone}
            label="App Appearance"
            subLabel="System Default"
          />
        </SettingGroup>

        {/* Support */}
        <SettingGroup title="Support">
          <SettingItem icon={HelpCircle} label="Help Center" />
          <SettingItem icon={Mail} label="Contact Support" />
          <SettingItem icon={Shield} label="Privacy Policy" />
        </SettingGroup>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-destructive/20 shadow-sm overflow-hidden">
          <Dialog>
            <DialogTrigger asChild>
              <div>
                <SettingItem
                  icon={LogOut}
                  label="Log Out"
                  destructive
                  onClick={() => { }}
                />
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  You will be logged out of your account on this device.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive">Log Out</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          MoneyTrack v1.0.2 • Built with ❤️
        </p>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <Layout>
      <SettingsContent />
    </Layout>
  );
}
