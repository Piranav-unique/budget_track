import { useState, useEffect } from "react";
import { ChevronLeft, TrendingDown, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Expense,
  Budget,
  getSpentByCategory,
  categoryBgCharts,
  categoryEmojis,
  getUnnecessaryExpenses,
} from "@/lib/expenses";

export default function Analytics() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget>({
    monthly: 2000,
    weekly: 500,
    savingsGoal: 500,
  });

  useEffect(() => {
    const saved = localStorage.getItem("expenses");
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((e: any) => ({
          ...e,
          date: new Date(e.date),
        }));
        setExpenses(parsed);
      } catch (e) {
        console.error("Error loading expenses:", e);
      }
    }

    const savedBudget = localStorage.getItem("budget");
    if (savedBudget) {
      try {
        setBudget(JSON.parse(savedBudget));
      } catch (e) {
        console.error("Error loading budget:", e);
      }
    }
  }, []);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Category breakdown
  const categorySpending = getSpentByCategory(expenses, monthStart, monthEnd);
  const pieData = Object.entries(categorySpending)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({
      name: category,
      value: parseFloat(amount.toFixed(2)),
      fill: categoryBgCharts[category as any],
    }));

  // Daily spending trend
  const dailySpending: Record<string, number> = {};
  expenses
    .filter(exp => exp.date >= monthStart && exp.date <= monthEnd)
    .forEach(exp => {
      const day = exp.date.toLocaleDateString();
      dailySpending[day] = (dailySpending[day] || 0) + exp.amount;
    });

  const trendData = Object.entries(dailySpending)
    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
    .map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: parseFloat(amount.toFixed(2)),
    }))
    .slice(-30); // Last 30 days

  // Weekly comparison
  const weeklyData = [];
  for (let i = 4; i >= 0; i--) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    let weekTotal = 0;
    expenses.forEach(exp => {
      if (exp.date >= weekStart && exp.date <= weekEnd) {
        weekTotal += exp.amount;
      }
    });

    weeklyData.push({
      week: `Week ${5 - i}`,
      spent: parseFloat(weekTotal.toFixed(2)),
      budget: budget.weekly,
    });
  }

  // Unnecessary expenses
  const unnecessaryExpenses = getUnnecessaryExpenses(expenses, monthStart, monthEnd);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
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
            Financial Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Analyze your spending patterns and get insights
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Category Breakdown */}
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Spending by Category</h2>
              {pieData.length > 0 ? (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: $${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Category List */}
                  <div className="space-y-3 w-full md:w-auto">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-sm font-medium text-foreground capitalize">
                          {item.name}
                        </span>
                        <span className="text-sm text-muted-foreground ml-auto">
                          ${item.value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No spending data yet</p>
              )}
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            {/* Daily Spending Trend */}
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Daily Spending Trend</h2>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.75rem",
                      }}
                      formatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No spending data yet</p>
              )}
            </div>

            {/* Weekly Comparison */}
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Weekly Budget vs Actual</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.75rem",
                    }}
                    formatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Bar dataKey="budget" fill="#10b981" name="Weekly Budget" />
                  <Bar dataKey="spent" fill="#3b82f6" name="Actual Spending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {/* High-Value Expenses */}
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-foreground">High-Value Transactions</h2>
              </div>
              {unnecessaryExpenses.length > 0 ? (
                <div className="space-y-3">
                  {unnecessaryExpenses.slice(0, 10).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{categoryEmojis[expense.category]}</span>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.date.toLocaleDateString()} • <span className="capitalize">{expense.category}</span>
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-primary text-lg">${expense.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No high-value expenses yet</p>
              )}
            </div>

            {/* Spending Insights */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Spending Insights</h2>
              </div>
              <div className="space-y-3 text-sm text-foreground">
                {pieData.length > 0 ? (
                  <>
                    {(() => {
                      const totalSpending = pieData.reduce((sum, item) => sum + item.value, 0);
                      const topCategory = pieData.reduce((max, item) =>
                        item.value > max.value ? item : max
                      );
                      const avgTransaction =
                        expenses
                          .filter(exp => exp.date >= monthStart && exp.date <= monthEnd)
                          .reduce((sum, exp) => sum + exp.amount, 0) /
                        expenses.filter(exp => exp.date >= monthStart && exp.date <= monthEnd)
                          .length || 0;

                      return (
                        <>
                          <p>
                            • Your top spending category is{" "}
                            <span className="font-bold capitalize">{topCategory.name}</span> at $
                            {topCategory.value.toFixed(2)} ({((topCategory.value / totalSpending) * 100).toFixed(0)}%)
                          </p>
                          <p>
                            • Your total spending this month is $
                            {totalSpending.toFixed(2)} out of ${budget.monthly.toFixed(2)} budget
                          </p>
                          <p>
                            • Average transaction: ${avgTransaction.toFixed(2)}
                          </p>
                          <p>
                            • You have ${(budget.monthly - totalSpending).toFixed(2)} left in your monthly budget
                          </p>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <p>Start tracking expenses to see insights</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
