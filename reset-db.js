import pg from 'pg';
import dotenv from 'dotenv';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resetDb() {
    try {
        console.log("Dropping all tables...");
        await pool.query('DROP TABLE IF EXISTS budgets CASCADE');
        await pool.query('DROP TABLE IF EXISTS income_sources CASCADE');
        await pool.query('DROP TABLE IF EXISTS expenses CASCADE');
        await pool.query('DROP TABLE IF EXISTS users CASCADE');
        console.log("All tables dropped successfully.");
    } catch (error) {
        console.error("Error resetting database:", error);
    } finally {
        await pool.end();
    }
}

resetDb();
