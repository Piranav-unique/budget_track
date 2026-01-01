import path from "path";
import { createServer } from "./index";
import * as express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

// Serve static files
app.use(express.static(distPath));

// SPA fallback for non-API routes
app.get("(.*)", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/health")) {
    return next();
  }

  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Fusion Starter running on port ${port}`);
});
