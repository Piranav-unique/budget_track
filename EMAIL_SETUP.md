# Email Setup Guide for OTP Verification

The Budget Tracker MCP connection requires email verification via OTP codes. To enable real email sending, you need to configure SMTP settings.

## Option 1: Gmail SMTP (Recommended for Development)

### Step 1: Enable 2-Step Verification
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Step Verification if not already enabled

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "Budget Tracker" as the name
5. Click **Generate**
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Configure Environment Variables

Add these to your `.env` file (or set them in your hosting platform like Render):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
```

**Important:** 
- Use your **App Password**, not your regular Gmail password
- Remove spaces from the app password when pasting
- The `SMTP_USER` and `SMTP_FROM` should be the same email address

### Step 4: Restart Your Server

After setting the environment variables, restart your server for the changes to take effect.

## Option 2: Other Email Providers

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

## Testing

1. Start your server
2. Check the console logs - you should see:
   - `✅ Email service configured with SMTP` (if configured correctly)
   - `⚠️  Email service not configured` (if SMTP is not set up)
3. Request an OTP from the MCP connection page
4. Check your email inbox for the verification code

## Troubleshooting

### "Authentication failed" error
- Make sure you're using an **App Password** for Gmail, not your regular password
- Verify 2-Step Verification is enabled on your Google account
- Check that the password has no spaces

### "Connection timeout" error
- Check your firewall settings
- Verify SMTP_HOST and SMTP_PORT are correct
- For Gmail, make sure "Less secure app access" is not needed (use App Passwords instead)

### Emails not arriving
- Check spam/junk folder
- Verify the recipient email address is correct
- Check server logs for error messages
- Verify SMTP credentials are correct

## Testing Email Configuration

### Using the Test Scripts

We provide standalone scripts to test your email configuration:

**JavaScript version:**
```bash
# Check configuration and test connection
node scripts/test-email.js

# Check configuration, test connection, and send a test email
node scripts/test-email.js --send your-email@example.com
```

**TypeScript version:**
```bash
# Check configuration and test connection
npx ts-node scripts/test-email.ts

# Check configuration, test connection, and send a test email
npx ts-node scripts/test-email.ts --send your-email@example.com
```

The scripts will:
1. ✅ Check if all required environment variables are set
2. 🔌 Test the SMTP connection
3. 📧 Optionally send a test email to verify everything works

### Using the API Endpoints

**Check Email Availability:**
```bash
# GET /api/mcp/check-email
# Returns detailed information about SMTP configuration and connection status
curl -X GET http://localhost:5000/api/mcp/check-email \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Send Test Email:**
```bash
# POST /api/mcp/test-email
# Sends a test email to your authenticated user's email address
curl -X POST http://localhost:5000/api/mcp/test-email \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Response Example (Check Email):**
```json
{
  "configured": true,
  "connectionTest": true,
  "details": {
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUser": "your-email@gmail.com",
    "smtpFrom": "your-email@gmail.com"
  },
  "message": "SMTP is configured and connection test passed"
}
```

## Development Mode

If SMTP is not configured, the OTP code will be logged to the server console. Check your server logs to see the OTP code during development.

