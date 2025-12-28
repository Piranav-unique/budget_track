import 'dotenv/config';
import { Pool } from 'pg';
import Groq from 'groq-sdk';

async function testConnections() {
    console.log('--- Diagnostic Test ---');

    // 1. Test Database
    console.log('\n1. Testing Database Connection...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', result.rows[0]);

        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('✅ Tables in public schema:', tables.rows.map(r => r.table_name));

        const expensesTable = tables.rows.find(r => r.table_name === 'expenses');
        if (expensesTable) {
            const columns = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'expenses'");
            console.log('✅ Columns in expenses table:');
            columns.rows.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));

            const count = await pool.query('SELECT COUNT(*) FROM expenses');
            console.log(`✅ 'expenses' table has ${count.rows[0].count} rows`);

            if (parseInt(count.rows[0].count) > 0) {
                const sample = await pool.query('SELECT * FROM expenses LIMIT 1');
                console.log('✅ Sample row:', sample.rows[0]);
            }
        } else {
            console.error("❌ 'expenses' table NOT found!");
        }
    } catch (err) {
        console.error('❌ Database query failed:', err.message);
    } finally {
        await pool.end();
    }

    // 2. Test Groq AI
    console.log('\n2. Testing Groq AI...');
    if (!process.env.GROQ_API_KEY) {
        console.error('❌ GROQ_API_KEY environment variable is not set');
        return;
    }
    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: 'test' }],
            model: 'llama-3.3-70b-versatile',
        });
        console.log('✅ Groq AI connected:', completion.choices[0]?.message?.content?.substring(0, 20) + '...');
    } catch (err) {
        console.error('❌ Groq AI failed:', err.message);
    }

    console.log('\n--- Diagnostic Finished ---');
}

testConnections();
