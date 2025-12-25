
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Heart,
  Target,
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AIInsight } from '@/hooks/use-ai-insights';

interface AIInsightsProps {
  insights: AIInsight[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRefresh: () => void;
  compact?: boolean;
}

const getInsightIcon = (type: AIInsight['type']) => {
  switch (type) {
    case 'spending_pattern':
      return TrendingUp;
    case 'budget_alert':
      return AlertTriangle;
    case 'savings_opportunity':
      return Target;
    case 'financial_health':
      return Heart;
    case 'recommendation':
      return Lightbulb;
    default:
      return Info;
  }
};

const getSeverityColor = (severity: AIInsight['severity']) => {
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

const getSeverityIcon = (severity: AIInsight['severity']) => {
  switch (severity) {
    case 'high':
      return AlertCircle;
    case 'medium':
      return AlertTriangle;
    case 'low':
      return CheckCircle;
    default:
      return Info;
  }
};

export function AIInsights({
  insights,
  loading,
  error,
  lastUpdated,
  onRefresh,
  compact = false
}: AIInsightsProps) {
  if (compact) {
    return (
      <Card className="border-0 shadow-lg shadow-purple-200/60 bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white overflow-hidden relative group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Brain className="w-32 h-32 text-white" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm shadow-lg">
                <Brain className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 uppercase tracking-wide backdrop-blur-sm border border-white/20">
                  🤖 AI Powered
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="text-white hover:bg-white/10 hover:text-white border border-white/20 backdrop-blur-sm"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-white/90">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Analyzing your spending...</span>
              </div>
            ) : error ? (
              <div className="text-white/90 text-sm">
                <p>AI insights unavailable</p>
                <p className="text-xs text-white/70 mt-1">Check Groq connection</p>
              </div>
            ) : insights.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-bold">Smart Analysis</h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  {insights[0]?.message || "Your spending patterns look good!"}
                </p>
                {insights.length > 1 && (
                  <div className="text-xs text-white/70">
                    +{insights.length - 1} more insights available
                  </div>
                )}
              </div>
            ) : (
              <div className="text-white/90 text-sm">
                <p>Add some expenses to get AI insights!</p>
              </div>
            )}
          </div>

          {lastUpdated && (
            <div className="mt-4 pt-4 border-t border-white/20 text-xs text-white/70">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Financial Insights</h2>
            <p className="text-sm text-slate-500">Powered by advanced analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="border border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
              <div>
                <p className="font-medium text-purple-900">Analyzing your financial data...</p>
                <p className="text-sm text-purple-600">This may take a few moments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">AI Service Unavailable</p>
                <p className="text-sm text-red-600">Please check your Groq API key to get AI insights</p>
                <p className="text-xs text-red-500 mt-1">Verify GROQ_API_KEY in .env</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && insights.length > 0 && (
        <div className="grid gap-4">
          {insights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type);
            const SeverityIcon = getSeverityIcon(insight.severity);

            return (
              <Card
                key={index}
                className={cn(
                  "border-l-4 transition-all hover:shadow-md",
                  insight.severity === 'high' ? 'border-l-red-500' :
                    insight.severity === 'medium' ? 'border-l-amber-500' :
                      'border-l-emerald-500'
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      getSeverityColor(insight.severity)
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{insight.title}</h3>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          getSeverityColor(insight.severity)
                        )}>
                          <SeverityIcon className="w-3 h-3" />
                          {insight.severity}
                        </div>
                        {insight.actionable && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Actionable
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 leading-relaxed">{insight.message}</p>
                      {insight.category && (
                        <div className="mt-2">
                          <span className="text-xs text-slate-500">
                            Related to: <span className="font-medium capitalize">{insight.category}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !error && insights.length === 0 && (
        <Card className="border border-slate-200">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 mx-auto flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              No insights available
            </h3>
            <p className="text-slate-500 mb-4">
              Add some expenses to get personalized AI insights about your spending.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}