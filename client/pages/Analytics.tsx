import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronLeft,
  DollarSign,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Budget,
  Expense,
  categoryBgCharts,
  categoryEmojis,
  getSpentByCategory,
} from "@/lib/expenses";

// ---------------- helpers ----------------
const cleanValue = (val?: string | null) => {
  if (!val) return "";
  return val.replace(/^"+|"+$/g, "").trim();
};

// ---------------- content component ----------------
const AnalyticsContent: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget>({
    monthly: 0,
    weekly: 0,
    savingsGoal: 0,
  });
  

  // ---------- fetch data ----------
  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to load expenses");

      const data = await res.json();
      const parsed: Expense[] = data.map((e: any) => {
        const rawDate = cleanValue(e.date ?? e.createdAt);
        const rawCategory = cleanValue(e.category);
        const rawDescription = cleanValue(e.description);

        return {
          id:
            (typeof e._id === "object" && e._id.toString()) ||
            (typeof e._id === "string" && e._id) ||
            e.id ||
            `${rawDescription}-${rawDate}`,
          description: rawDescription,
          amount: Number(cleanValue(String(e.amount ?? 0))),
          category: (rawCategory?.toLowerCase() ?? "other") as any,
          note: e.note ?? undefined,
          date: new Date(rawDate || Date.now()),
        };
      });

      parsed.sort((a, b) => b.date.getTime() - a.date.getTime());
      setExpenses(parsed);
    } catch (err) {
      console.error("Error loading expenses:", err);
    }
  };

  useEffect(() => {
    fetchExpenses();

    if (user) {
      const budgetKey = `budget_${user.id}`;
      const savedBudget = localStorage.getItem(budgetKey);
      if (savedBudget) {
        try {
          setBudget(JSON.parse(savedBudget));
        } catch (err) {
          console.error("Error loading budget:", err);
        }
      }
    }
  }, [user]);

  // ---------- date ranges ----------
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // ---------- analytics ----------
  const categorySpending = getSpentByCategory(expenses, monthStart, monthEnd);
  
  // Calculate total spending first
  const totalSpending = expenses
    .filter((e) => e.date >= monthStart && e.date <= monthEnd)
    .reduce((sum, e) => sum + e.amount, 0);

  // Then calculate pie data with totalSpending available
  const pieData = Object.entries(categorySpending)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => {
      const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
      return {
        name: category,
        value: Number(amount.toFixed(2)),
        fill: categoryBgCharts[category as any],
        percentage: Math.round(percentage * 100) / 100,
      };
    })
    .sort((a, b) => b.value - a.value);

  const dailySpending: Record<string, number> = {};
  expenses
    .filter((e) => e.date >= monthStart && e.date <= monthEnd)
    .forEach((e) => {
      const key = e.date.toLocaleDateString();
      dailySpending[key] = (dailySpending[key] || 0) + e.amount;
    });

  const trendData = Object.entries(dailySpending)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      amount: Number(amount.toFixed(2)),
    }))
    .slice(-30);

  const weeklyData = [] as any[];
  for (let i = 4; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    let total = 0;
    expenses.forEach((e) => {
      if (e.date >= start && e.date <= end) total += e.amount;
    });

    weeklyData.push({
      week: `Week ${5 - i}`,
      spent: Number(total.toFixed(2)),
      budget: budget.weekly,
    });
  }

  // Removed rule-based unnecessary expenses - use AI insights instead
  const unnecessaryExpenses: Expense[] = [];

  // totalSpending is now calculated above
    
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevMonthSpending = expenses
    .filter((e) => e.date >= prevMonthStart && e.date <= prevMonthEnd)
    .reduce((sum, e) => sum + e.amount, 0);
    
  const spendingChange = prevMonthSpending 
    ? ((totalSpending - prevMonthSpending) / prevMonthSpending) * 100 
    : 0;
    
  const avgTransaction = expenses.length > 0 
    ? totalSpending / expenses.length 
    : 0;
    
  const topCategory = pieData.length ? pieData[0] : null;
  const secondCategory = pieData.length > 1 ? pieData[1] : null;

  // ---------------- render ----------------
  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Financial Analytics
            </h1>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="text-indigo-600" />
                  <span className={`text-sm font-medium ${spendingChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {spendingChange > 0 ? (
                      <span className="flex items-center">
                        <ArrowUp className="w-4 h-4 mr-1" />
                        {Math.abs(spendingChange).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <ArrowDown className="w-4 h-4 mr-1" />
                        {Math.abs(spendingChange).toFixed(1)}%
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">Total Spending</p>
                <p className="text-2xl font-bold text-foreground">₹{totalSpending.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {spendingChange >= 0 ? 'Up' : 'Down'} from last month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="text-purple-600" />
                  {topCategory && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: topCategory.fill }} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">Top Category</p>
                <p className="text-2xl font-bold capitalize">
                  {topCategory?.name || "None"}
                </p>
                {topCategory && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {topCategory.percentage}% of total spending
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="text-blue-600" />
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {expenses.length} {expenses.length === 1 ? 'txn' : 'txns'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">Avg. Transaction</p>
                <p className="text-2xl font-bold text-foreground">₹{avgTransaction.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expenses.length} transactions this month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="text-green-600" />
                  {secondCategory && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: secondCategory.fill }} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">Budget Status</p>
                <p className="text-2xl font-bold">
                  {budget.monthly > 0 ? `₹${(budget.monthly - totalSpending).toFixed(2)}` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {budget.monthly > 0 ? `Left of ₹${budget.monthly} budget` : 'Monthly budget not set'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-3 max-w-xl mx-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  {pieData.length ? (
                    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="w-full md:w-1/2 h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={pieData} 
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={3}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={true}
                              labelLineLength={20}
                              labelLineWidth={2}
                              labelLineStroke="#666"
                              labelStyle={{
                                fontSize: '12px',
                                fill: '#374151',
                                fontWeight: 500,
                                textShadow: '0 0 4px white',
                              }}
                            >
                              {pieData.map((e, i) => (
                                <Cell 
                                  key={`cell-${i}`} 
                                  fill={e.fill} 
                                  stroke="#fff" 
                                  strokeWidth={1}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string, props: any) => [
                                `₹${value.toFixed(2)}`,
                                name,
                                `${props.payload.percentage}% of total`
                              ]}
                              contentStyle={{
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #e5e7eb',
                                padding: '8px 12px',
                                backgroundColor: 'white',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2">
                        <h3 className="font-medium text-foreground text-lg mb-4">Spending Breakdown</h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                          {pieData.map((item, index) => (
                            <div 
                              key={index} 
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center flex-1 min-w-0">
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0 mr-3" 
                                  style={{ backgroundColor: item.fill }}
                                />
                                <span className="text-sm font-medium truncate">
                                  {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                                </span>
                              </div>
                              <div className="flex items-center ml-4">
                                <span className="text-sm font-medium whitespace-nowrap">
                                  ₹{item.value.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2 w-12 text-right">
                                  ({item.percentage}%)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <span className="font-semibold">Total:</span> ₹{totalSpending.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <p className="text-muted-foreground">No spending data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends */}
            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line dataKey="amount" stroke="#3b82f6" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insights */}
            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle>Expense Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Use AI insights on the Dashboard to get intelligent analysis of your spending patterns.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// ---------------- page wrapper ----------------
export default function Analytics() {
  return (
    <Layout>
      <AnalyticsContent />
    </Layout>
  );
}
