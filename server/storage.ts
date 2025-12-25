import { pool } from './db';
import { User, InsertUser } from '@shared/api';

export interface IStorage {
    getUser(id: number): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
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
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
            [insertUser.username, insertUser.password]
        );
        return result.rows[0];
    }
}

export const storage = new DatabaseStorage();
