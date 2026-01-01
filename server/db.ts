import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { Pool } from "pg";

console.log("Initializing database pool...");

if (!process.env.DATABASE_URL) {
  console.error("CRITICAL: DATABASE_URL is missing!");
} else {
  console.log("DATABASE_URL is present.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // REQUIRED for Supabase pooler
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

    console.log("Database connected & tables initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}
