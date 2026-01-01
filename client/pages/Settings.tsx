import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";

function SettingsContent() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, logoutMutation, updateProfileMutation } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const applyTheme = (nextTheme: "light" | "dark" | "system") => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    if (nextTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      setDarkMode(prefersDark);
    } else {
      root.classList.toggle("dark", nextTheme === "dark");
      setDarkMode(nextTheme === "dark");
    }

    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    // Load notification preference
    const storedNotifications = localStorage.getItem("notificationsEnabled");
    if (storedNotifications !== null) {
      setNotifications(storedNotifications === "true");
    }

    // Load theme preference
    const storedTheme = (localStorage.getItem("theme") as "light" | "dark" | "system" | null) || "system";
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  // Initialize edit form when dialog opens or user changes
  useEffect(() => {
    if (editDialogOpen && user) {
      setEditDisplayName(user.display_name || "");
      setEditEmail(user.email || "");
    }
  }, [editDialogOpen, user]);

  const handleUpdateProfile = () => {
    if (!user) return;

    const updates: Partial<{ display_name: string; email: string }> = {};
    if (editDisplayName !== user.display_name) {
      updates.display_name = editDisplayName.trim() || undefined;
    }
    if (editEmail !== user.email) {
      if (editEmail && !editEmail.includes('@')) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }
      updates.email = editEmail.trim() || undefined;
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: "No changes",
        description: "No changes were made to your profile.",
      });
      setEditDialogOpen(false);
      return;
    }

    updateProfileMutation.mutate(updates, {
      onSuccess: () => {
        setEditDialogOpen(false);
      },
    });
  };

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
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden divide-y divide-border">
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
      className={`p-4 flex items-center justify-between hover:bg-muted/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
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
    <div className="min-h-screen bg-background p-4 md:p-8">
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
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm flex items-center gap-4 mb-8">
          <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
            <AvatarImage src="/avatar-placeholder.png" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-xl">
              {(user?.display_name?.[0] || user?.email?.[0] || user?.username?.[0] || "G").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-bold">
              {user?.display_name || user?.email?.split('@')[0] || user?.username?.replace(/^(google|github)_/, '') || "Guest user"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {user ? `Signed in to your SmartSpend Flow account${user?.email ? ` (${user.email})` : ''}` : "Not signed in"}
            </p>
          </div>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Update your display name and email address.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    disabled={updateProfileMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is how your name will appear in the application.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={updateProfileMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your email address for account notifications.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outline" disabled={updateProfileMutation.isPending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleUpdateProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
              <Switch
                checked={notifications}
                onCheckedChange={(checked) => {
                  const value = Boolean(checked);
                  setNotifications(value);
                  localStorage.setItem("notificationsEnabled", String(value));
                  toast({
                    title: "Notifications",
                    description: value
                      ? "Notifications are enabled for this device."
                      : "Notifications are disabled for this device.",
                  });
                }}
              />
            }
          />
          <SettingItem
            icon={Moon}
            label="Dark Mode"
            action={
              <Switch
                checked={darkMode}
                onCheckedChange={(checked) => {
                  const isDark = Boolean(checked);
                  applyTheme(isDark ? "dark" : "light");
                  toast({
                    title: "Appearance updated",
                    description: isDark
                      ? "Dark mode enabled."
                      : "Light mode enabled.",
                  });
                }}
              />
            }
          />
          <SettingItem
            icon={Smartphone}
            label="App Appearance"
            subLabel={
              theme === "system"
                ? "System Default"
                : theme === "dark"
                ? "Dark"
                : "Light"
            }
            onClick={() => {
              const next =
                theme === "system" ? "light" : theme === "light" ? "dark" : "system";
              applyTheme(next);
              toast({
                title: "Appearance updated",
                description:
                  next === "system"
                    ? "Using system appearance."
                    : next === "dark"
                    ? "Dark mode enabled."
                    : "Light mode enabled.",
              });
            }}
          />
        </SettingGroup>

        {/* Support */}
        <SettingGroup title="Support">
          <SettingItem
            icon={HelpCircle}
            label="Help Center"
            subLabel="Basic help and tips"
            onClick={() =>
              toast({
                title: "Help Center",
                description:
                  "Help articles will be available soon. For now, contact support via email.",
              })
            }
          />
          <SettingItem
            icon={Mail}
            label="Contact Support"
            subLabel="support@smartspendflow.app"
            onClick={() => {
              window.location.href =
                "mailto:support@smartspendflow.app?subject=SmartSpend%20Flow%20Support&body=Describe%20your%20issue%20here.";
            }}
          />
          <SettingItem
            icon={Shield}
            label="Privacy Policy"
            subLabel="How we handle your data"
            onClick={() => navigate("/privacy")}
          />
        </SettingGroup>

        {/* Danger Zone */}
        <div className="bg-card rounded-xl border border-destructive/20 shadow-sm overflow-hidden">
          <Dialog>
            <DialogTrigger asChild>
              <div>
                <SettingItem
                  icon={LogOut}
                  label="Log Out"
                  destructive
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
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      logoutMutation.mutate(undefined, {
                        onSuccess: () => {
                          navigate("/login");
                        },
                        onError: (err: Error) => {
                          toast({
                            title: "Logout failed",
                            description: err.message,
                            variant: "destructive",
                          });
                        },
                      });
                    }}
                  >
                    Log Out
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          SmartSpend Flow v1.0.2 • Built with ❤️
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
