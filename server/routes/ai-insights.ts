import { Request, Response } from 'express';
import { AIInsightsService } from '../services/ai-insights';
import { pool } from '../db';
import { User } from '../../shared/api';
import { getGroqApiKey } from '../services/groq';

export async function handleGetAIInsights(req: Request, res: Response) {
  try {
    // Require authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const user = req.user as User;

    // Get expenses from database for the authenticated user only
    const result = await pool.query(
      "SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT 200",
      [user.id]
    );
    const expenseData = result.rows;

    // Transform to expected format
    const expenses = expenseData.map(exp => ({
      id: exp.id.toString(),
      description: exp.description,
      amount: Number(exp.amount), // Ensure amount is a number
      category: exp.category,
      date: new Date(exp.date || exp.created_at),
      note: exp.note
    }));

    // Get budget from request body or use defaults
    const budget = req.body.budget || {
      monthly: 20000,
      weekly: 5000,
      savingsGoal: 10000
    };

    // Initialize AI service
    const aiService = new AIInsightsService();

    // Generate insights
    const insights = await aiService.generateInsights(expenses, budget);

    res.json({
      success: true,
      insights,
      timestamp: new Date().toISOString(),
      expenseCount: expenses.length,
      source: 'ai'
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);

    // Fallback safe insights rather than returning 503 error
    const aiService = new AIInsightsService();
    const fallbackInsights = await aiService.generateInsights([], { monthly: 20000, weekly: 5000, savingsGoal: 10000 });

    res.json({
      success: true,
      insights: fallbackInsights,
      timestamp: new Date().toISOString(),
      expenseCount: 0,
      source: 'fallback'
    });
  }
}

export async function handleGetQuickInsight(req: Request, res: Response) {
  try {
    const { expenseData, budget } = req.body;

    const safeBudget = budget || { monthly: 20000, weekly: 5000, savingsGoal: 10000 };
    const safeExpenses = expenseData || [];

    const aiService = new AIInsightsService();
    const insights = await aiService.generateInsights(safeExpenses, safeBudget);

    res.json({
      success: true,
      insights: insights.slice(0, 2), // Return only top 2 insights for quick view
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating quick insight:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quick insight',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function handleSuggestBudget(req: Request, res: Response) {
  try {
    const { income } = req.body;

    if (income === undefined || isNaN(income)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing income'
      });
    }

    const aiService = new AIInsightsService();
    const suggestion = await aiService.suggestBudget(income);

    res.json({
      success: true,
      suggestion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error suggesting budget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate budget suggestion',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
