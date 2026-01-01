import { useState, useEffect } from 'react';
import type { AIInsight, UseAIInsightsReturn } from '@/types/ai-insight';

export function useAIInsights(budget?: any, expenses?: any[]): UseAIInsightsReturn {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          budget: budget || {
            monthly: 0,
            weekly: 0,
            savingsGoal: 0
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Use the suggestion from the server if available, otherwise use the message
        const errorMessage = errorData.suggestion || errorData.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success && data.insights) {
        // Add id and date to insights if missing
        const insightsWithIds = data.insights.map((insight: any, index: number) => ({
          ...insight,
          id: insight.id || `insight-${Date.now()}-${index}`,
          date: insight.date ? new Date(insight.date) : new Date(),
        }));
        setInsights(insightsWithIds);
        setLastUpdated(new Date());
      } else {
        setInsights([]);
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights. Please try again later.');
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have budget data
    if (budget) {
      const timeoutId = setTimeout(() => {
        fetchInsights();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [budget?.monthly, budget?.weekly, budget?.savingsGoal, expenses?.length]);

  const refreshInsights = async () => {
    await fetchInsights();
  };

  return {
    insights,
    loading,
    error,
    lastUpdated,
    refreshInsights,
  };
}
