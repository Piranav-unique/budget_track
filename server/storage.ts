import { pool } from './db';
import { User, InsertUser } from '../shared/api';

export interface IStorage {
    getUser(id: number): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
    updateUser(id: number, updates: Partial<Pick<User, 'display_name' | 'email'>>): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
    async getUser(id: number): Promise<User | undefined> {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0];
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        const result = await pool.query(
            'INSERT INTO users (username, password, display_name, email, provider) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [
                insertUser.username, 
                insertUser.password,
                insertUser.display_name || null,
                insertUser.email || null,
                insertUser.provider || null
            ]
        );
        return result.rows[0];
    }

    async updateUser(id: number, updates: Partial<Pick<User, 'display_name' | 'email'>>): Promise<User | undefined> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.display_name !== undefined) {
            fields.push(`display_name = $${paramIndex}`);
            values.push(updates.display_name || null);
            paramIndex++;
        }

        if (updates.email !== undefined) {
            fields.push(`email = $${paramIndex}`);
            values.push(updates.email || null);
            paramIndex++;
        }

        if (fields.length === 0) {
            // No updates to make, just return the user
            return this.getUser(id);
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        return result.rows[0];
    }
}

export const storage = new DatabaseStorage();
