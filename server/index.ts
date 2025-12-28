import "dotenv/config";
import express from "express";
import cors from "cors";

import { handleCategorizeExpense } from "./routes/categorize-expense";
import { handleCreateExpense, handleListExpenses } from "./routes/expenses";
import { handleGetAIInsights, handleGetQuickInsight } from "./routes/ai-insights";
import { setupAuth } from "./auth";
import { initDb } from "./db";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  setupAuth(app);

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });



  // AI Expense Categorization endpoint
  app.post("/api/categorize-expense", handleCategorizeExpense);
  app.post("/api/expenses", handleCreateExpense);
  app.get("/api/expenses", handleListExpenses);

  // AI Insights endpoints
  app.post("/api/ai-insights", handleGetAIInsights);
  app.post("/api/ai-insights/quick", handleGetQuickInsight);

  // Initialize DB tables
  initDb().catch((error) => {
    console.error("Failed to initialize database:", error);
    console.error("The application will continue but database operations may fail.");
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", {
      message: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
      method: req.method
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

  return app;
}
