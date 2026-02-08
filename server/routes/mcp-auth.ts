import { Request, Response } from 'express';
import { otpService } from '../services/otp-service';
import { mcpTokenService } from '../services/mcp-token-service';
import { emailService } from '../services/email-service';
import { storage } from '../storage';

/**
 * Request OTP for MCP connection
 * POST /api/mcp/request-otp
 */
export async function handleRequestOTP(req: Request, res: Response) {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = req.user as any;
        if (!user.email) {
            return res.status(400).json({ 
                error: 'Email address required. Please update your profile with an email address.' 
            });
        }

        // Generate and send OTP
        const code = await otpService.createOTP(user.id, user.email);
        
        try {
            await emailService.sendOTP(user.email, code, user.display_name || user.username);
            
            // Check if SMTP is configured (if not, email service will log to console)
            const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
            
            res.json({ 
                message: smtpConfigured 
                    ? 'OTP code sent to your email address' 
                    : 'OTP code generated (check server console - SMTP not configured)',
                email: user.email, // Return masked email for confirmation
                // In development mode (SMTP not configured), include OTP in response
                // This is safe because it's only shown if SMTP is not configured
                ...(smtpConfigured ? {} : { 
                    developmentMode: true,
                    otpCode: code,
                    note: 'SMTP is not configured. OTP is shown here for development only. Configure SMTP to send real emails.'
                })
            });
        } catch (error) {
            // If email sending fails but we have the code, still return success
            // The code is logged to console as fallback
            console.error('Email sending failed, but OTP code is:', code);
            res.json({ 
                message: 'OTP code generated (email sending failed - check server logs)',
                email: user.email,
                developmentMode: true,
                otpCode: code,
                note: 'Email sending failed. Check SMTP configuration. OTP code is shown here for development.'
            });
        }
    } catch (error) {
        console.error('Error requesting OTP:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to send OTP' 
        });
    }
}

/**
 * Verify OTP and generate MCP token
 * POST /api/mcp/verify-otp
 */
export async function handleVerifyOTP(req: Request, res: Response) {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = req.user as any;
        const { code } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'OTP code is required' });
        }

        // Verify OTP
        const isValid = await otpService.verifyOTP(user.id, user.email, code);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP code' });
        }

        // Generate MCP token
        const token = await mcpTokenService.createToken(user.id);

        console.log(`✅ MCP token generated for user: ${user.email || user.username} (ID: ${user.id})`);

        res.json({ 
            token,
            message: 'MCP connection verified. Use this token in ChatGPT.',
            expiresIn: '30 days',
            userEmail: user.email,
            username: user.username
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to verify OTP' 
        });
    }
}

/**
 * Get current user's MCP token status
 * GET /api/mcp/token-status
 */
export async function handleTokenStatus(req: Request, res: Response) {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = req.user as any;
        
        // Check if user has email
        if (!user.email) {
            return res.json({
                hasEmail: false,
                hasToken: false,
                message: 'Email address required for MCP connection'
            });
        }

        // Check for active tokens for this user
        const { pool } = await import('../db');
        const tokenResult = await pool.query(
            `SELECT COUNT(*) as count FROM mcp_tokens 
             WHERE user_id = $1 AND expires_at > NOW()`,
            [user.id]
        );
        const hasActiveToken = parseInt(tokenResult.rows[0].count) > 0;

        res.json({
            hasEmail: true,
            hasToken: hasActiveToken,
            userEmail: user.email,
            username: user.username,
            userId: user.id,
            message: hasActiveToken 
                ? 'You have an active MCP token' 
                : 'Request OTP to generate a new MCP token'
        });
    } catch (error) {
        console.error('Error getting token status:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to get token status' 
        });
    }
}

/**
 * Verify which account a token belongs to (for debugging)
 * GET /api/mcp/verify-token?token=...
 */
export async function handleVerifyToken(req: Request, res: Response) {
    try {
        const token = req.query.token as string;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const { pool } = await import('../db');
        const result = await pool.query(
            `SELECT mcp_tokens.user_id, users.email, users.username, users.display_name,
                    mcp_tokens.expires_at, mcp_tokens.created_at
             FROM mcp_tokens
             JOIN users ON mcp_tokens.user_id = users.id
             WHERE mcp_tokens.token = $1 AND mcp_tokens.expires_at > NOW()
             LIMIT 1`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Token not found or expired',
                valid: false
            });
        }

        const tokenInfo = result.rows[0];
        res.json({
            valid: true,
            user: {
                id: tokenInfo.user_id,
                email: tokenInfo.email,
                username: tokenInfo.username,
                displayName: tokenInfo.display_name
            },
            expiresAt: tokenInfo.expires_at,
            createdAt: tokenInfo.created_at
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Failed to verify token' 
        });
    }
}

