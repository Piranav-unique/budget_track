import Groq from 'groq-sdk';
import { getGroqApiKey } from './groq';

export interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  note?: string;
}

export interface BudgetData {
  monthly: number;
  weekly: number;
  savingsGoal: number;
}

export interface AIInsight {
  type: 'spending_pattern' | 'budget_alert' | 'savings_opportunity' | 'financial_health' | 'recommendation';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  actionable: boolean;
  category?: string;
}

export class AIInsightsService {
  private groq: Groq;
  private model: string;

  constructor(model: string = process.env.GROQ_MODEL || 'openai/gpt-oss-120b') {
    const apiKey = getGroqApiKey();
    this.groq = new Groq({ apiKey });
    this.model = model;
  }

  async suggestBudget(income: number): Promise<{ monthlySpend: number; savingsGoal: number; explanation: string }> {
    try {
      const apiKey = getGroqApiKey();
      if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured.');
      }

      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional financial planner. Based on the user's monthly income, suggest a balanced budget using the 50/30/20 rule or an optimized variation for young professionals / corporate employees.
            
            CRITICAL: Respond ONLY with valid JSON - no other text.
            
            JSON format:
            {
              "monthlySpend": number,
              "savingsGoal": number,
              "explanation": "A short, friendly sentence explaining the recommendation (max 100 chars)"
            }`
          },
          {
            role: 'user',
            content: `My monthly income is ₹${income}. What budget do you suggest?`
          }
        ],
        temperature: 0.6,
      });

      const content = response.choices[0]?.message?.content || '{}';
      let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '');
      const result = JSON.parse(cleanContent);

      return {
        monthlySpend: result.monthlySpend || Math.round(income * 0.8),
        savingsGoal: result.savingsGoal || Math.round(income * 0.2),
        explanation: result.explanation || "Balanced budget for your income level."
      };
    } catch (error) {
      console.error('Error suggesting budget:', error);
      // Fallback to 80/20 rule
      return {
        monthlySpend: Math.round(income * 0.8),
        savingsGoal: Math.round(income * 0.2),
        explanation: "Suggested based on common financial guidelines (80% spending, 20% savings)."
      };
    }
  }

  async generateInsights(expenses: ExpenseData[], budget: BudgetData): Promise<AIInsight[]> {
    try {
      const apiKey = getGroqApiKey();
      if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured.');
      }

      // If user has no expenses yet, provide encouraging onboarding starter insights
      if (!expenses || expenses.length === 0) {
        const safeMonthly = budget.monthly > 0 ? budget.monthly : 20000;
        const safeSavings = budget.savingsGoal > 0 ? budget.savingsGoal : 10000;
        return [
          {
            type: 'financial_health',
            title: 'Welcome to SmartSpend Flow',
            message: 'You have no expenses logged yet. Track your daily spends or log your corporate allowance to unlock AI analysis!',
            severity: 'low',
            actionable: true,
          },
          {
            type: 'savings_opportunity',
            title: '₹30k Income Target',
            message: `Your monthly limit is ₹${safeMonthly.toLocaleString()}. Save ₹${safeSavings.toLocaleString()} by keeping daily spends under ₹700.`,
            severity: 'low',
            actionable: true,
          },
          {
            type: 'recommendation',
            title: 'Corporate ₹50 Spend',
            message: 'Your routine ₹50/day company spend sums to ₹1,500/month from your Current Bank Account.',
            severity: 'low',
            actionable: true,
          }
        ];
      }

      // Prepare expense data for analysis
      const expenseAnalysis = this.prepareExpenseAnalysis(expenses, budget);
      const prompt = this.createAnalysisPrompt(expenseAnalysis);

      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a helpful financial advisor who explains things in simple, clear English. Analyze spending data and provide easy-to-understand insights that anyone can follow.

CRITICAL: Respond ONLY with valid JSON - no other text before or after.

JSON format:
[
  {
    "type": "spending_pattern|budget_alert|savings_opportunity|financial_health|recommendation",
    "title": "Simple, clear title (max 25 chars)",
    "message": "Easy to understand advice in plain English (max 120 chars)",
    "severity": "low|medium|high", 
    "actionable": true,
    "category": "optional category name"
  }
]

Rules for insights:
- Use simple, everyday language that anyone can understand
- Give practical, actionable advice
- Be encouraging and positive
- Mention Current Bank Account and daily corporate spend if relevant
- Keep it simple, helpful, and easy to read!`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      });

      const insights = this.parseAIResponse(response.choices[0]?.message?.content || '');
      if (insights && insights.length > 0) {
        return insights;
      }
      throw new Error('No structured insights returned by AI');
    } catch (error) {
      console.error('Error generating AI insights:', error);

      // Return high quality intelligent fallback insights so UI is never broken
      const safeMonthly = budget.monthly > 0 ? budget.monthly : 20000;
      const safeDaily = Math.round(safeMonthly / 30);
      const totalSpent = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const remaining = safeMonthly - totalSpent;

      return [
        {
          type: remaining > 0 ? 'financial_health' : 'budget_alert',
          title: remaining > 0 ? 'Budget On Track' : 'Budget Warning',
          message: remaining > 0 
            ? `You have ₹${remaining.toLocaleString()} remaining out of ₹${safeMonthly.toLocaleString()} this month. Keep it up!` 
            : `You have exceeded your monthly limit of ₹${safeMonthly.toLocaleString()} by ₹${Math.abs(remaining).toLocaleString()}.`,
          severity: remaining > 0 ? 'low' : 'high',
          actionable: true,
        },
        {
          type: 'recommendation',
          title: 'Daily Spend Limit',
          message: `Keep your routine daily expenses under ₹${safeDaily} to maintain a balanced budget.`,
          severity: 'low',
          actionable: true,
        },
        {
          type: 'savings_opportunity',
          title: 'Corporate ₹50 Spend',
          message: 'At ₹50 daily company spend, your corporate allowance is ₹1,500/month from Current Bank Account.',
          severity: 'low',
          actionable: true,
        }
      ];
    }
  }

  private prepareExpenseAnalysis(expenses: ExpenseData[], budget: BudgetData) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Filter current month expenses
    const monthlyExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= monthStart && d <= monthEnd;
    });

    // Calculate totals by category
    const categoryTotals: Record<string, number> = {};
    monthlyExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const safeMonthlyBudget = budget.monthly > 0 ? budget.monthly : 20000;
    const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const averageExpense = monthlyExpenses.length > 0 ? totalSpent / monthlyExpenses.length : 0;
    const budgetUsed = (totalSpent / safeMonthlyBudget) * 100;

    // Find highest spending categories
    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const highExpenses = monthlyExpenses
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      totalExpenses: monthlyExpenses.length,
      totalSpent,
      budgetUsed,
      averageExpense,
      topCategories,
      highExpenses,
      budget: { ...budget, monthly: safeMonthlyBudget },
      daysInMonth: monthEnd.getDate() || 30,
      currentDay: Math.max(1, now.getDate())
    };
  }

  private createAnalysisPrompt(analysis: any): string {
    const burnRate = analysis.totalSpent / analysis.currentDay;
    const projectedMonthlySpend = burnRate * analysis.daysInMonth;
    const monthlyBudget = analysis.budget.monthly > 0 ? analysis.budget.monthly : 20000;
    const savingsRate = Math.max(0, ((monthlyBudget - analysis.totalSpent) / monthlyBudget) * 100);

    return `Look at this person's spending and give 3-4 helpful money tips in simple English. Make it easy to understand and actionable.

SPENDING SUMMARY:
- Monthly budget: ₹${monthlyBudget.toLocaleString()}
- Spent so far: ₹${analysis.totalSpent.toLocaleString()} (${(analysis.budgetUsed || 0).toFixed(1)}% of budget)
- Day ${analysis.currentDay} of ${analysis.daysInMonth} this month
- Spending about ₹${burnRate.toFixed(0)} per day
- Projected spend: ₹${projectedMonthlySpend.toFixed(0)} this month
- Savings potential: ${savingsRate.toFixed(1)}% of budget
- Total purchases: ${analysis.totalExpenses}
- Average purchase: ₹${analysis.averageExpense.toFixed(0)}

WHERE THE MONEY GOES:
${analysis.topCategories.length > 0 ? analysis.topCategories.map(([cat, amount]: [string, number]) => {
      const percentage = analysis.totalSpent > 0 ? ((amount / analysis.totalSpent) * 100).toFixed(1) : '0';
      return `- ${cat.charAt(0).toUpperCase() + cat.slice(1)}: ₹${amount.toLocaleString()} (${percentage}% of spending)`;
    }).join('\n') : '- No categorised spending yet'}

Give advice on staying within the monthly budget, managing corporate spends (₹50/day), and using Current Bank Account wisely!`;
  }

  private parseAIResponse(content: string): AIInsight[] {
    try {
      let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '').trim();

      const jsonArrayMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonArrayMatch) {
        const parsed = JSON.parse(jsonArrayMatch[0]);
        return this.normalizeInsights(parsed);
      }

      try {
        const parsed = JSON.parse(cleanContent);
        if (Array.isArray(parsed)) {
          return this.normalizeInsights(parsed);
        }
        if (parsed.insights) return this.normalizeInsights(parsed.insights);
        return this.normalizeInsights([parsed]);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  private normalizeInsights(insights: any[]): AIInsight[] {
    if (!Array.isArray(insights)) return [];
    return insights.map((insight: any) => ({
      type: this.normalizeType(insight.type || insight.metric || 'recommendation'),
      title: insight.title || 'Financial Tip',
      message: insight.message || insight.interpretation || 'Smart spending guidance.',
      severity: this.normalizeSeverity(insight.severity || 'low'),
      actionable: insight.actionable !== false,
      category: insight.category
    }));
  }

  private normalizeType(type: string): AIInsight['type'] {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('budget') || lowerType.includes('alert')) return 'budget_alert';
    if (lowerType.includes('pattern') || lowerType.includes('spending')) return 'spending_pattern';
    if (lowerType.includes('saving') || lowerType.includes('opportunity')) return 'savings_opportunity';
    if (lowerType.includes('health') || lowerType.includes('financial')) return 'financial_health';
    return 'recommendation';
  }

  private normalizeSeverity(severity: string): AIInsight['severity'] {
    const lowerSeverity = severity?.toLowerCase() || '';
    if (lowerSeverity.includes('high') || lowerSeverity.includes('critical')) return 'high';
    if (lowerSeverity.includes('medium') || lowerSeverity.includes('moderate')) return 'medium';
    return 'low';
  }
}
