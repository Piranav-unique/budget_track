import { randomBytes } from 'node:crypto';
import { pool } from '../db';

export interface MCPToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
}

export class MCPTokenService {
    /**
     * Generate a secure random token
     */
    private generateToken(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * Create an MCP token for a user (valid for 30 days)
     */
    async createToken(userId: number): Promise<string> {
        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await pool.query(
            `INSERT INTO mcp_tokens (user_id, token, expires_at)
             VALUES ($1, $2, $3)`,
            [userId, token, expiresAt]
        );

        return token;
    }

    /**
     * Validate and get user ID from token
     */
    async validateToken(token: string): Promise<number | null> {
        const result = await pool.query(
            `SELECT user_id FROM mcp_tokens
             WHERE token = $1 AND expires_at > NOW()
             LIMIT 1`,
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].user_id;
    }

    /**
     * Revoke a token
     */
    async revokeToken(token: string): Promise<void> {
        await pool.query(
            'UPDATE mcp_tokens SET expires_at = NOW() WHERE token = $1',
            [token]
        );
    }

    /**
     * Revoke all tokens for a user
     */
    async revokeUserTokens(userId: number): Promise<void> {
        await pool.query(
            'UPDATE mcp_tokens SET expires_at = NOW() WHERE user_id = $1',
            [userId]
        );
    }

    /**
     * Clean up expired tokens
     */
    async cleanupExpired(): Promise<void> {
        await pool.query(
            'DELETE FROM mcp_tokens WHERE expires_at < NOW()'
        );
    }
}

export const mcpTokenService = new MCPTokenService();

