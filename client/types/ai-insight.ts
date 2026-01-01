export type AIInsight = {
  id: string;
  title: string;
  message: string;
  type: 'spending_pattern' | 'budget_alert' | 'savings_opportunity' | 'financial_health' | 'recommendation';
  severity: 'high' | 'medium' | 'low';
  category?: string;
  actionable?: boolean;
  date: Date;
};

export type UseAIInsightsReturn = {
  insights: AIInsight[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshInsights: () => Promise<void>;
};

export type UseAIInsights = () => UseAIInsightsReturn;
