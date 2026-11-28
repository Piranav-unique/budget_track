import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Menu,
  X,
  Wallet,
  BarChart3,
  Settings,
  Plus,
  Home,
  Zap,
  CreditCard,
  CalendarCheck,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddIncomeModal } from "@/components/QuickAddIncomeModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logoutMutation } = useAuth();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/bills", label: "Recurring Bills", icon: CalendarCheck },
    { path: "/add-expense", label: "Add Expense", icon: Plus },
    { path: "/budget", label: "Budgets & Limits", icon: Wallet },
    { path: "/analytics", label: "Analytics & Trends", icon: BarChart3 },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      {/* Desktop Sidebar - Copilot / Monarch Inspired */}
      <aside className="hidden md:flex md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between shrink-0 transition-colors duration-200">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">SmartSpend</h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Personal & Corporate</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")} />
                  {item.label}
                </Link>
              );
            })}

            {/* Quick Action in Sidebar */}
            <div className="pt-3">
              <QuickAddIncomeModal
                trigger={
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 transition-all cursor-pointer shadow-sm"
                  >
                    <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>+ Quick Income / Bonus</span>
                  </button>
                }
              />
            </div>
          </nav>
        </div>

        {/* User Profile Pill at Bottom + Theme Toggle */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 transition-colors">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {user?.username ? user.username.substring(0, 2).toUpperCase() : "PM"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.display_name || user?.username || "Piranav MN"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block" />
                  Live Sync
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <ThemeToggle className="h-8 w-8 p-1.5" />
              <button
                onClick={() => logoutMutation?.mutate()}
                title="Sign out"
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm transition-colors">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-base">SmartSpend</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="h-8 w-8 p-1.5" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col justify-between",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">SmartSpend</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-3">
              <QuickAddIncomeModal
                trigger={
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 text-left cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>+ Quick Income / Bonus</span>
                  </button>
                }
              />
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">
              {user?.display_name || user?.username || "Piranav MN"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Logged in via Cloud VPS</p>
          </div>
          <ThemeToggle className="h-8 w-8 p-1.5" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
      </div>
    </div>
  );
}
