/**
 * Standalone script to test email availability and SMTP configuration
 * 
 * Usage:
 *   node scripts/test-email.js
 *   node scripts/test-email.js --send test@example.com
 * 
 * Make sure to set environment variables:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-app-password
 *   SMTP_FROM=your-email@gmail.com
 */

import 'dotenv/config';
import nodemailer from 'nodemailer';

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'cyan');
    console.log('='.repeat(60));
}

/**
 * Check SMTP configuration
 */
function checkConfiguration() {
    logSection('📋 Checking SMTP Configuration');

    const config = {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT || '587',
        SMTP_SECURE: process.env.SMTP_SECURE === 'true',
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : undefined,
        SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER,
    };

    let allConfigured = true;
    const requiredKeys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    const optionalKeys = ['SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM'];

    for (const [key, value] of Object.entries(config)) {
        const isRequired = requiredKeys.includes(key);
        const isOptional = optionalKeys.includes(key);
        
        if (key === 'SMTP_PASS') {
            const masked = value ? '***' + value.slice(-4) : undefined;
            log(`  ${key}: ${masked || '❌ NOT SET'}`, value ? 'green' : 'red');
        } else {
            const displayValue = value !== undefined ? value : (isOptional ? '(optional)' : '❌ NOT SET');
            log(`  ${key}: ${displayValue}`, value ? 'green' : (isOptional ? 'yellow' : 'red'));
        }
        
        // Only fail if required keys are missing
        if (!value && isRequired) {
            allConfigured = false;
        }
    }

    if (!allConfigured) {
        log('\n⚠️  Missing required environment variables!', 'yellow');
        log('   Required: SMTP_HOST, SMTP_USER, SMTP_PASS', 'yellow');
        log('   Optional: SMTP_PORT (default: 587), SMTP_SECURE (default: false), SMTP_FROM', 'yellow');
        return null;
    }

    log('\n✅ All required environment variables are set!', 'green');
    return config;
}

/**
 * Test SMTP connection
 */
async function testConnection(config) {
    logSection('🔌 Testing SMTP Connection');

    const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT),
        secure: config.SMTP_SECURE,
        auth: {
            user: config.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        log('  Verifying SMTP connection...', 'blue');
        await transporter.verify();
        log('  ✅ SMTP connection verified successfully!', 'green');
        return transporter;
    } catch (error) {
        log('  ❌ SMTP connection verification failed!', 'red');
        log(`  Error: ${error.message}`, 'red');
        
        if (error.code === 'EAUTH') {
            log('\n  💡 Common issues:', 'yellow');
            log('     - Incorrect email or password', 'yellow');
            log('     - For Gmail: Make sure you\'re using an App Password, not your regular password', 'yellow');
            log('     - 2FA must be enabled on your Google account', 'yellow');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            log('\n  💡 Common issues:', 'yellow');
            log('     - Check your internet connection', 'yellow');
            log('     - Verify SMTP_HOST is correct', 'yellow');
            log('     - Check if firewall is blocking the connection', 'yellow');
        }
        
        return null;
    }
}

/**
 * Send a test email
 */
async function sendTestEmail(transporter, toEmail) {
    logSection('📧 Sending Test Email');

    const testCode = 'TEST123';
    const testSubject = 'Budget Tracker - Email Test';

    try {
        log(`  Sending test email to: ${toEmail}`, 'blue');
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: toEmail,
            subject: testSubject,
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
                            <h1>✅ Email Test Successful!</h1>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>This is a test email from your Budget Tracker application.</p>
                            <p>If you received this email, your SMTP configuration is working correctly!</p>
                            <div class="code">${testCode}</div>
                            <p>Test completed at: ${new Date().toLocaleString()}</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated test message from Budget Tracker</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Budget Tracker - Email Test

                Hello,

                This is a test email from your Budget Tracker application.

                If you received this email, your SMTP configuration is working correctly!

                Test Code: ${testCode}

                Test completed at: ${new Date().toLocaleString()}

                This is an automated test message from Budget Tracker
            `,
        });

        log('  ✅ Test email sent successfully!', 'green');
        log(`  Message ID: ${info.messageId}`, 'blue');
        log(`  Response: ${info.response}`, 'blue');
        log(`\n  📬 Check your inbox at: ${toEmail}`, 'cyan');
        log('  💡 Also check your spam/junk folder if you don\'t see it', 'yellow');
        
        return true;
    } catch (error) {
        log('  ❌ Failed to send test email!', 'red');
        log(`  Error: ${error.message}`, 'red');
        
        if (error.code === 'EAUTH') {
            log('\n  💡 Authentication failed. Check your credentials.', 'yellow');
        } else if (error.responseCode === 550) {
            log('\n  💡 Email address rejected. Check if the recipient email is valid.', 'yellow');
        }
        
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    log('\n🚀 Budget Tracker - Email Availability Test', 'cyan');
    log('='.repeat(60) + '\n');

    // Check configuration
    const config = checkConfiguration();
    if (!config) {
        log('\n❌ Configuration check failed. Please set the required environment variables.', 'red');
        process.exit(1);
    }

    // Test connection
    const transporter = await testConnection(config);
    if (!transporter) {
        log('\n❌ Connection test failed. Please check your SMTP configuration.', 'red');
        process.exit(1);
    }

    // Check if user wants to send a test email
    const args = process.argv.slice(2);
    const sendEmailIndex = args.indexOf('--send');
    
    if (sendEmailIndex !== -1 && args[sendEmailIndex + 1]) {
        const testEmail = args[sendEmailIndex + 1];
        const success = await sendTestEmail(transporter, testEmail);
        
        if (success) {
            log('\n✅ All tests passed! Email functionality is working correctly.', 'green');
            process.exit(0);
        } else {
            log('\n❌ Email sending failed. Please check the error messages above.', 'red');
            process.exit(1);
        }
    } else {
        log('\n✅ Configuration and connection tests passed!', 'green');
        log('\n💡 To send a test email, run:', 'yellow');
        log('   node scripts/test-email.js --send your-email@example.com', 'yellow');
        process.exit(0);
    }
}

// Run the script
main().catch((error) => {
    log('\n❌ Unexpected error:', 'red');
    console.error(error);
    process.exit(1);
});

