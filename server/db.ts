import "dotenv/config";


// FIX: Disable strict SSL validation to allow connection to Supabase Transaction Pooler (which uses self-signed certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { Pool } from "pg";

console.log("Initializing database pool...");

if (!process.env.DATABASE_URL) {
  console.error("CRITICAL: DATABASE_URL is missing!");
} else {
  console.log("DATABASE_URL is present.");
}

const isLocal = process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : {
    rejectUnauthorized: false,
  },
});

export const query = (text: string, params?: any[]) =>
  pool.query(text, params);

export async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        display_name TEXT,
        email TEXT,
        provider TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chat_id TEXT,
        amount DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        source TEXT,
        note TEXT,
        confidence TEXT,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create income_sources table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS income_sources (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'one-time',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Drop frequency check constraint if it exists to allow one-time/spot/bonus incomes
    await pool.query(`
      ALTER TABLE income_sources DROP CONSTRAINT IF EXISTS income_sources_frequency_check;
    `).catch(() => {});

    // Create budgets table (One per user)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        monthly_limit DECIMAL(10, 2) DEFAULT 0,
        savings_goal DECIMAL(10, 2) DEFAULT 0,
        income DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_budget UNIQUE (user_id)
      );
    `);

    // Create MCP OTP codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mcp_otp_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create MCP tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mcp_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create bank_accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'current',
        account_number TEXT,
        bank_name TEXT,
        balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        currency TEXT NOT NULL DEFAULT 'INR',
        is_primary BOOLEAN DEFAULT FALSE,
        color TEXT DEFAULT 'blue',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create account_transfers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_transfers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        from_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
        to_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL,
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mcp_otp_user_email ON mcp_otp_codes(user_id, email);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mcp_otp_code ON mcp_otp_codes(code);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mcp_tokens_token ON mcp_tokens(token);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user ON mcp_tokens(user_id);
    `);

    // Add corporate reimbursement support to expenses
    await pool.query(`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN DEFAULT FALSE;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_status VARCHAR(20) DEFAULT 'none';
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS claim_ref VARCHAR(100);
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS corporate_project TEXT;
    `).catch((err) => {
      console.warn("Reimbursement columns already present or table alteration skipped:", err?.message);
    });

    console.log("Database connected & tables initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}
