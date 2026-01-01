import { Request, Response } from 'express';
import { AIInsightsService } from '../services/ai-insights';
import { pool } from '../db';
import { User } from '../../shared/api';

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
      monthly: 0,
      weekly: 0,
      savingsGoal: 0
    };

    // Check if API key is configured before initializing service
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === '') {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured',
        message: 'GROQ_API_KEY environment variable is not set. Please configure the API key to use AI insights.',
        suggestion: 'Add GROQ_API_KEY to your .env file. Get your API key from https://console.groq.com/'
      });
    }

    // Initialize AI service
    let aiService: AIInsightsService;
    try {
      aiService = new AIInsightsService();
    } catch (error) {
      return res.status(503).json({
        success: false,
        error: 'AI service configuration error',
        message: error instanceof Error ? error.message : 'Failed to initialize AI service',
        suggestion: 'Please check your GROQ_API_KEY configuration'
      });
    }

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

    // Determine appropriate status code and message
    let statusCode = 503;
    let errorMessage = 'AI service unavailable';
    let suggestion = 'Please ensure your Groq API key is valid and configured';

    if (error instanceof Error) {
      if (error.message.includes('authentication') || error.message.includes('API key') || error.message.includes('not configured')) {
        statusCode = 503;
        errorMessage = 'AI service authentication error';
        suggestion = 'Please configure GROQ_API_KEY in your environment variables. Get your API key from https://console.groq.com/';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        statusCode = 429;
        errorMessage = 'AI service rate limit exceeded';
        suggestion = 'Please try again later or check your API usage limits';
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestion
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