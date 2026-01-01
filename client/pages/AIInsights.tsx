import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Info, Heart, Brain, RefreshCw, ArrowLeft, Plus, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAIInsights } from '@/hooks/use-ai-insights';
import type { AIInsight } from '@/types/ai-insight';
import { Expense, Budget } from '@/lib/expenses';
import { useAuth } from '@/hooks/use-auth';

export default function AIInsightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget>({
    monthly: 0,
    weekly: 0,
    savingsGoal: 0,
  });
  

  // Fetch expenses and budget
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await fetch("/api/expenses");
        if (res.ok) {
          const data = await res.json();
          const parsed = data.map((e: any) => {
            const rawDate = e.date ?? e.created_at ?? e.createdAt;
            return {
              id: e.id || e._id?.toString() || `${e.description || 'expense'}-${rawDate}`,
              description: e.description || "",
              amount: Number(e.amount || 0),
              category: (e.category?.toLowerCase() || "other") as any,
              note: e.note || undefined,
              date: new Date(rawDate || Date.now()),
            };
          });
          parsed.sort((a: Expense, b: Expense) => b.date.getTime() - a.date.getTime());
          setExpenses(parsed);
        }
      } catch (e) {
        console.error("Error loading expenses:", e);
      }
    };

    if (user) {
      const budgetKey = `budget_${user.id}`;
      const savedBudget = localStorage.getItem(budgetKey);
      if (savedBudget) {
        try {
          setBudget(JSON.parse(savedBudget));
        } catch (e) {
          console.error("Error loading budget:", e);
        }
      }
    }

    fetchExpenses();
  }, [user]);
  
  // Use the AI insights hook with real data
  const { insights = [], loading = false, error = null, lastUpdated = null, refreshInsights } = useAIInsights(budget, expenses);
  
  // Filter insights based on search query
  const filteredInsights = insights.filter(insight => 
    insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sr-only">
        <h1>AI Financial Insights | SmartSpend Flow</h1>
        <p>AI-powered financial insights for your spending and savings</p>
      </div>

      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Financial Insights</h1>
              <p className="text-sm text-gray-500">
                {loading ? 'Analyzing your financial data...' : 'Powered by advanced AI analysis'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-64">
              <Input
                type="text"
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshInsights}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList>
                  <TabsTrigger value="all">All Insights</TabsTrigger>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                  <TabsTrigger value="savings">Savings</TabsTrigger>
                  <TabsTrigger value="spending">Spending</TabsTrigger>
                </TabsList>
                {lastUpdated && (
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>

              <TabsContent value="all" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredInsights.length > 0 ? (
                    filteredInsights.map((insight, index) => (
                      <AIIndividualInsight key={index} insight={insight} />
                    ))
                  ) : (
                    <div className="col-span-3 py-12 text-center">
                      <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No insights found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchQuery ? 'Try a different search term' : 'No insights available for the selected filters'}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Other tab contents can be added similarly */}
              <TabsContent value="alerts">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInsights
                    .filter(insight => insight.severity === 'high' || insight.severity === 'medium')
                    .map((insight, index) => (
                      <AIIndividualInsight key={index} insight={insight} />
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="savings">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInsights
                    .filter(insight => insight.type === 'savings_opportunity')
                    .map((insight, index) => (
                      <AIIndividualInsight key={index} insight={insight} />
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="spending">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInsights
                    .filter(insight => insight.type === 'spending_pattern')
                    .map((insight, index) => (
                      <AIIndividualInsight key={index} insight={insight} />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Insight Summary</CardTitle>
                <CardDescription>Overview of your financial health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Total Insights</span>
                      <span className="font-medium">{insights.length}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${Math.min(insights.length * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Alerts</span>
                      <span className="font-medium text-red-500">
                        {insights.filter(i => i.severity === 'high').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500" 
                        style={{ 
                          width: `${(insights.filter(i => i.severity === 'high').length / Math.max(insights.length, 1)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Savings Opportunities</span>
                      <span className="font-medium text-green-500">
                        {insights.filter(i => i.type === 'savings_opportunity').length}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ 
                          width: `${(insights.filter(i => i.type === 'savings_opportunity').length / Math.max(insights.length, 1)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Categories</h4>
                  <div className="space-y-3">
                    {Array.from(new Set(insights.map(i => i.category).filter(Boolean))).map((category, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{category}</span>
                        <span className="font-medium">
                          {insights.filter(i => i.category === category).length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Budget
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Generate Custom Report
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Brain className="h-4 w-4" />
                  Get Personalized Advice
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual Insight Card Component
function AIIndividualInsight({ insight }: { insight: AIInsight }) {
  const Icon = getInsightIcon(insight.type);
  const SeverityIcon = getSeverityIcon(insight.severity);
  
  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            getSeverityColor(insight.severity).split(' ')[0],
            getSeverityColor(insight.severity).split(' ')[1]
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">{insight.title}</h3>
              <div className={cn(
                "flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                getSeverityColor(insight.severity)
              )}>
                <SeverityIcon className="w-3 h-3" />
                <span className="capitalize">{insight.severity}</span>
              </div>
              {insight.actionable && (
                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Actionable
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{insight.message}</p>
            {insight.category && (
              <div className="mt-auto">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {insight.category}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions (these would typically be in a separate utils file)
function getInsightIcon(type: string) {
  const icons: Record<string, any> = {
    spending_pattern: BarChart2,
    budget_alert: AlertTriangle,
    savings_opportunity: ArrowLeft, // Using ArrowLeft as a placeholder for a savings icon
    financial_health: Heart,
    recommendation: Brain,
  };
  return icons[type] || Brain;
}

function getSeverityIcon(severity: string) {
  const icons: Record<string, any> = {
    high: AlertTriangle,
    medium: AlertTriangle,
    low: CheckCircle,
  };
  return icons[severity.toLowerCase()] || Info;
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Severity color mapping
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    default:
      return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

// Individual Insight Card Component
function AIIndividualInsight({ insight }: { insight: AIInsight }) {
  const Icon = getInsightIcon(insight.type);
  const SeverityIcon = getSeverityIcon(insight.severity);
  
  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            getSeverityColor(insight.severity).split(' ')[0],
            getSeverityColor(insight.severity).split(' ')[1]
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">{insight.title}</h3>
              <div className={cn(
                "flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                getSeverityColor(insight.severity)
              )}>
                <SeverityIcon className="w-3 h-3" />
                <span className="capitalize">{insight.severity}</span>
              </div>
              {insight.actionable && (
                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Actionable
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{insight.message}</p>
            {insight.category && (
              <div className="mt-auto">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {insight.category}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getInsightIcon(type: string) {
  const icons: Record<string, any> = {
    spending_pattern: BarChart2,
    budget_alert: AlertTriangle,
    savings_opportunity: ArrowLeft,
    financial_health: Heart,
    recommendation: Brain,
  };
  return icons[type] || Brain;
}

function getSeverityIcon(severity: string) {
  const icons: Record<string, any> = {
    high: AlertTriangle,
    medium: AlertTriangle,
    low: CheckCircle,
  };
  return icons[severity.toLowerCase()] || Info;
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
