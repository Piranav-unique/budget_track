import { randomBytes } from 'node:crypto';
import { pool } from '../db';

export interface OTPCode {
    id: number;
    user_id: number;
    email: string;
    code: string;
    expires_at: Date;
    used: boolean;
    created_at: Date;
}

export class OTPService {
    /**
     * Generate a 6-digit OTP code
     */
    private generateOTP(): string {
        // Generate a random 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        return code;
    }

    /**
     * Create and store an OTP code for a user
     */
    async createOTP(userId: number, email: string): Promise<string> {
        const code = this.generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Invalidate any existing unused OTPs for this user/email
        await pool.query(
            'UPDATE mcp_otp_codes SET used = TRUE WHERE user_id = $1 AND email = $2 AND used = FALSE',
            [userId, email]
        );

        // Insert new OTP
        await pool.query(
            `INSERT INTO mcp_otp_codes (user_id, email, code, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [userId, email, code, expiresAt]
        );

        return code;
    }

    /**
     * Verify an OTP code
     */
    async verifyOTP(userId: number, email: string, code: string): Promise<boolean> {
        const result = await pool.query(
            `SELECT * FROM mcp_otp_codes
             WHERE user_id = $1 AND email = $2 AND code = $3 AND used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, email, code]
        );

        if (result.rows.length === 0) {
            return false;
        }

        // Mark OTP as used
        await pool.query(
            'UPDATE mcp_otp_codes SET used = TRUE WHERE id = $1',
            [result.rows[0].id]
        );

        return true;
    }

    /**
     * Clean up expired OTP codes
     */
    async cleanupExpired(): Promise<void> {
        await pool.query(
            'DELETE FROM mcp_otp_codes WHERE expires_at < NOW() - INTERVAL \'1 hour\''
        );
    }
}

export const otpService = new OTPService();

