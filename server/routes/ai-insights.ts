import { Request, Response } from 'express';
import { AIInsightsService } from '../services/ai-insights';
import { pool } from '../db';

export async function handleGetAIInsights(req: Request, res: Response) {
  try {
    // Get expenses from database
    const result = await pool.query(
      "SELECT * FROM expenses ORDER BY date DESC LIMIT 200"
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
      monthly: 2000,
      weekly: 500,
      savingsGoal: 500
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
    res.status(503).json({
      success: false,
      error: 'AI service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please ensure your Groq API key is valid and configured'
    });
  }
}

export async function handleGetQuickInsight(req: Request, res: Response) {
  try {
    const { expenseData, budget } = req.body;

    if (!expenseData || !budget) {
      return res.status(400).json({
        success: false,
        error: 'Missing expense data or budget information'
      });
    }

    const aiService = new AIInsightsService();
    const insights = await aiService.generateInsights(expenseData, budget);

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