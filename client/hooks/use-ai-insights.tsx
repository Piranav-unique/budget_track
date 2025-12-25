import { useState, useEffect } from 'react';

export interface AIInsight {
  type: 'spending_pattern' | 'budget_alert' | 'savings_opportunity' | 'financial_health' | 'recommendation';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  actionable: boolean;
  category?: string;
}

export interface AIInsightsResponse {
  success: boolean;
  insights: AIInsight[];
  timestamp: string;
  expenseCount: number;
}

export function useAIInsights(budget: any, expenses: any[]) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInsights = async () => {
    if (!budget || expenses.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ budget }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AIInsightsResponse = await response.json();
      
      if (data.success) {
        setInsights(data.insights);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to fetch insights');
      }
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      setError(err instanceof Error ? err.message : 'AI service unavailable');
      setInsights([]); // No fallback, just empty insights
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = () => {
    fetchInsights();
  };

  // Auto-fetch insights when budget or expenses change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchInsights();
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [budget, expenses.length]);

  return {
    insights,
    loading,
    error,
    lastUpdated,
    refreshInsights,
  };
}

