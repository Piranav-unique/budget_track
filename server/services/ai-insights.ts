import Groq from 'groq-sdk';

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

  constructor(model: string = 'llama-3.3-70b-versatile') {
    const apiKey = process.env.GROQ_API_KEY || '';
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('GROQ_API_KEY is not configured. Please set the GROQ_API_KEY environment variable.');
    }
    this.groq = new Groq({ apiKey });
    this.model = model;
  }

  async suggestBudget(income: number): Promise<{ monthlySpend: number; savingsGoal: number; explanation: string }> {
    try {
      if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === '') {
        throw new Error('GROQ_API_KEY is not configured.');
      }

      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional financial planner. Based on the user's monthly income, suggest a balanced budget using the 50/30/20 rule or an optimized variation for students/low-income earners.
            
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
      // Check if API key is still valid
      if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === '') {
        throw new Error('GROQ_API_KEY is not configured. Please set the GROQ_API_KEY environment variable.');
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
    "actionable": true/false,
    "category": "optional category name"
  }
]

Rules for insights:
- Use simple, everyday language that anyone can understand
- Avoid complex financial jargon and technical terms
- Give practical, actionable advice
- Be encouraging and positive
- Focus on what the user can actually do
- Use specific numbers and examples when helpful
- Make it sound like friendly advice from a knowledgeable friend

Examples of good language:
- "You're spending too much on..." instead of "expenditure velocity indicates..."
- "You could save money by..." instead of "cost optimization through..."
- "Your budget looks good" instead of "capital allocation efficiency..."
- "Try to spend less on..." instead of "rationalize discretionary spending..."

Keep it simple, helpful, and easy to read!`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      });

      const insights = this.parseAIResponse(response.choices[0]?.message?.content || '');
      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('401') || error.message.includes('403')) {
          throw new Error('AI service authentication failed. Please check your GROQ_API_KEY configuration.');
        }
        if (error.message.includes('GROQ_API_KEY is not configured')) {
          throw error; // Re-throw the specific error
        }
      }

      throw new Error(`AI service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private prepareExpenseAnalysis(expenses: ExpenseData[], budget: BudgetData) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Filter current month expenses
    const monthlyExpenses = expenses.filter(e =>
      e.date >= monthStart && e.date <= monthEnd
    );

    // Calculate totals by category
    const categoryTotals: Record<string, number> = {};
    monthlyExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const averageExpense = totalSpent / (monthlyExpenses.length || 1);
    const budgetUsed = (totalSpent / budget.monthly) * 100;

    // Find highest spending categories
    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    // Let AI determine high expenses based on context, not hardcoded rules
    // Return all expenses sorted by amount for AI to analyze
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
      budget,
      daysInMonth: monthEnd.getDate(),
      currentDay: now.getDate()
    };
  }

  private createAnalysisPrompt(analysis: any): string {
    const burnRate = analysis.totalSpent / analysis.currentDay;
    const projectedMonthlySpend = burnRate * analysis.daysInMonth;
    const savingsRate = ((analysis.budget.monthly - analysis.totalSpent) / analysis.budget.monthly) * 100;
    const expenditureVelocity = (analysis.budgetUsed / (analysis.currentDay / analysis.daysInMonth)) * 100;

    return `Look at this person's spending and give 4-5 helpful money tips in simple English. Make it easy to understand and actionable.

SPENDING SUMMARY:
- Monthly budget: ₹${analysis.budget.monthly.toLocaleString()}
- Spent so far: ₹${analysis.totalSpent.toLocaleString()} (${analysis.budgetUsed.toFixed(1)}% of budget)
- Day ${analysis.currentDay} of ${analysis.daysInMonth} this month
- Spending about ₹${burnRate.toFixed(0)} per day
- If this continues, will spend ₹${projectedMonthlySpend.toFixed(0)} this month
- Could save ${savingsRate.toFixed(1)}% of budget
- Made ${analysis.totalExpenses} purchases
- Average purchase: ₹${analysis.averageExpense.toFixed(0)}

WHERE THE MONEY GOES:
${analysis.topCategories.map(([cat, amount]: [string, number]) => {
      const percentage = ((amount / analysis.totalSpent) * 100).toFixed(1);
      return `- ${cat.charAt(0).toUpperCase() + cat.slice(1)}: ₹${amount.toLocaleString()} (${percentage}% of spending)`;
    }).join('\n')}

BIGGEST EXPENSES:
${analysis.highExpenses.slice(0, 3).map((exp: any) =>
      `- ₹${exp.amount} on ${exp.description} (${exp.category})`
    ).join('\n')}

Give advice like:
- "You're doing great with your budget!"
- "Try to spend less on [category] to save more money"
- "You could save ₹X by doing Y"
- "Your [category] spending is higher than usual"
- "Good job staying within your budget!"

Make it sound like helpful advice from a friend who's good with money. Use simple words and be encouraging!`;
  }

  private parseAIResponse(content: string): AIInsight[] {
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/```/g, '');

      // Try to extract JSON array from the response
      const jsonArrayMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (jsonArrayMatch) {
        const parsed = JSON.parse(jsonArrayMatch[0]);
        return this.normalizeInsights(parsed);
      }

      // Try to parse the entire content as JSON
      try {
        const parsed = JSON.parse(cleanContent);

        // If it's already an array of insights
        if (Array.isArray(parsed)) {
          return this.normalizeInsights(parsed);
        }

        // If it's a complex object, try to extract insights from various possible structures
        if (parsed.insights) return this.normalizeInsights(parsed.insights);
        if (parsed.advice) return this.convertAdviceToInsights(parsed.advice);
        if (parsed.financialAnalysis) return this.extractInsightsFromAnalysis(parsed);
        if (parsed.insightSummary) return this.normalizeInsights(parsed.insightSummary);

        // If it's a single insight object, wrap it in an array
        return this.normalizeInsights([parsed]);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content);
      return [];
    }
  }

  private normalizeInsights(insights: any[]): AIInsight[] {
    return insights.map((insight: any) => ({
      type: this.normalizeType(insight.type || insight.metric || 'recommendation'),
      title: insight.title || insight.metric || 'Financial Analysis',
      message: insight.message || insight.interpretation || insight.comment || 'Analysis provided',
      severity: this.normalizeSeverity(insight.severity || 'medium'),
      actionable: insight.actionable !== false,
      category: insight.category
    }));
  }

  private extractInsightsFromAnalysis(analysis: any): AIInsight[] {
    const insights: AIInsight[] = [];

    // Extract insights from different sections of complex analysis
    if (analysis.insightSummary && Array.isArray(analysis.insightSummary)) {
      return this.normalizeInsights(analysis.insightSummary);
    }

    // Extract from financial analysis sections
    const sections = analysis.financialAnalysis || analysis;
    Object.keys(sections).forEach(key => {
      const section = sections[key];
      if (section && section.comment) {
        insights.push({
          type: this.normalizeType(key),
          title: this.formatTitle(key),
          message: section.comment,
          severity: 'medium' as const,
          actionable: true,
          category: undefined
        });
      }
    });

    return insights.slice(0, 5); // Limit to 5 insights
  }

  private formatTitle(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/Analysis$/, '')
      .trim();
  }

  private convertAdviceToInsights(advice: string[]): AIInsight[] {
    return advice.map((message, index) => {
      let type: AIInsight['type'] = 'recommendation';
      let severity: AIInsight['severity'] = 'low';
      let title = 'Money Tip';

      // Determine type and severity based on content
      if (message.toLowerCase().includes('great') || message.toLowerCase().includes('good work')) {
        type = 'financial_health';
        title = 'Great Job!';
      } else if (message.toLowerCase().includes('spend less') || message.toLowerCase().includes('save')) {
        type = 'savings_opportunity';
        title = 'Save Money';
        severity = 'medium';
      } else if (message.toLowerCase().includes('budget')) {
        type = 'budget_alert';
        title = 'Budget Update';
      } else if (message.toLowerCase().includes('spending')) {
        type = 'spending_pattern';
        title = 'Spending Tip';
      }

      return {
        type,
        title,
        message: message.length > 120 ? message.substring(0, 117) + '...' : message,
        severity,
        actionable: !message.toLowerCase().includes('great') && !message.toLowerCase().includes('good work'),
        category: undefined
      };
    });
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