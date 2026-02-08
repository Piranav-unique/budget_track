import nodemailer from 'nodemailer';

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        // Initialize transporter if SMTP is configured
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log('✅ Email service configured with SMTP');
        } else {
            console.warn('⚠️  Email service not configured - OTPs will be logged to console only');
            console.warn('   Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables to enable email sending');
        }
    }

    /**
     * Send OTP code via email
     */
    async sendOTP(email: string, code: string, userName?: string): Promise<void> {
        // If SMTP is configured, send real email
        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: email,
                    subject: 'Your Budget Tracker MCP Verification Code',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                                .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
                                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>Budget Tracker MCP Verification</h1>
                                </div>
                                <div class="content">
                                    <p>Hello ${userName || 'User'},</p>
                                    <p>Your verification code for ChatGPT MCP connection is:</p>
                                    <div class="code">${code}</div>
                                    <p>This code will expire in <strong>10 minutes</strong>.</p>
                                    <p>If you didn't request this code, please ignore this email.</p>
                                </div>
                                <div class="footer">
                                    <p>This is an automated message from Budget Tracker</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `,
                    text: `
                        Budget Tracker MCP Verification

                        Hello ${userName || 'User'},

                        Your verification code for ChatGPT MCP connection is:

                        ${code}

                        This code will expire in 10 minutes.

                        If you didn't request this code, please ignore this email.
                    `,
                });
                console.log(`✅ OTP email sent successfully to ${email}`);
            } catch (error) {
                console.error('❌ Failed to send OTP email:', error);
                // Fall back to console logging
                this.logOTPToConsole(email, code, userName);
                throw new Error('Failed to send email. Please check your SMTP configuration.');
            }
        } else {
            // Fallback: log to console (development mode)
            this.logOTPToConsole(email, code, userName);
        }
    }

    /**
     * Log OTP to console (development fallback)
     */
    private logOTPToConsole(email: string, code: string, userName?: string): void {
        console.log('='.repeat(50));
        console.log('📧 OTP Email (Development Mode - SMTP not configured)');
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
        console.log('');
        console.log('⚠️  To enable real email sending, configure SMTP environment variables:');
        console.log('   SMTP_HOST=smtp.gmail.com');
        console.log('   SMTP_PORT=587');
        console.log('   SMTP_SECURE=false');
        console.log('   SMTP_USER=your-email@gmail.com');
        console.log('   SMTP_PASS=your-app-password');
        console.log('   SMTP_FROM=your-email@gmail.com');
        console.log('='.repeat(50));
    }
}

export const emailService = new EmailService();

