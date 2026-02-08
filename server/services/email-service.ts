// Simple email service - in production, use a service like SendGrid, AWS SES, or Nodemailer
// For now, we'll log the OTP and you can integrate a real email service later

export class EmailService {
    /**
     * Send OTP code via email
     * In production, integrate with a real email service
     */
    async sendOTP(email: string, code: string, userName?: string): Promise<void> {
        // TODO: Integrate with real email service (SendGrid, AWS SES, Nodemailer, etc.)
        
        // For development: log to console
        console.log('='.repeat(50));
        console.log('📧 OTP Email (Development Mode)');
        console.log('='.repeat(50));
        console.log(`To: ${email}`);
        console.log(`Subject: Your Budget Tracker MCP Verification Code`);
        console.log('');
        console.log(`Hello ${userName || 'User'},`);
        console.log('');
        console.log(`Your verification code for ChatGPT MCP connection is:`);
        console.log('');
        console.log(`    ${code}`);
        console.log('');
        console.log(`This code will expire in 10 minutes.`);
        console.log('');
        console.log(`If you didn't request this code, please ignore this email.`);
        console.log('='.repeat(50));

        // In production, uncomment and configure:
        /*
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            // Configure your email service
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Your Budget Tracker MCP Verification Code',
            html: `
                <h2>Budget Tracker MCP Verification</h2>
                <p>Hello ${userName || 'User'},</p>
                <p>Your verification code for ChatGPT MCP connection is:</p>
                <h1 style="font-size: 32px; letter-spacing: 8px; color: #2563eb;">${code}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            `,
        });
        */
    }
}

export const emailService = new EmailService();

