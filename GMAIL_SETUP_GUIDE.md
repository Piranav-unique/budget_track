# Gmail SMTP Setup Guide - Step by Step

This guide will help you set up Gmail SMTP authentication for sending OTP verification emails.

## Prerequisites

- A Gmail account
- Access to your Google Account settings
- Your server environment variables (`.env` file or hosting platform like Render)

## Step-by-Step Instructions

### Step 1: Enable 2-Step Verification

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Click on "Security"** in the left sidebar
3. **Find "2-Step Verification"** and click on it
4. **Click "Get Started"** if not already enabled
5. **Follow the prompts** to set up 2-Step Verification:
   - Enter your password
   - Choose a verification method (phone number recommended)
   - Verify your phone number
   - Turn on 2-Step Verification

> **Note**: You MUST enable 2-Step Verification before you can generate an App Password.

### Step 2: Generate App Password

1. **Go to App Passwords page**: https://myaccount.google.com/apppasswords
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords

2. **Select the app**: Choose **"Mail"**

3. **Select the device**: Choose **"Other (Custom name)"**

4. **Enter a name**: Type **"Budget Tracker"** (or any name you prefer)

5. **Click "Generate"**

6. **Copy the 16-character password**:
   - It will look like: `abcd efgh ijkl mnop`
   - **Important**: Copy it exactly as shown (with or without spaces - we'll remove spaces)

### Step 3: Configure Environment Variables

#### For Local Development (.env file):

Create or edit your `.env` file in the project root:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=your-email@gmail.com
```

**Replace:**
- `your-email@gmail.com` with your actual Gmail address
- `abcdefghijklmnop` with your 16-character App Password (remove spaces if any)

**Example:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=piranav.richu2006@gmail.com
SMTP_PASS=qlpvcdiisfwlkjss
SMTP_FROM=piranav.richu2006@gmail.com
```

#### For Render.com (Production):

1. **Go to your Render dashboard**: https://dashboard.render.com
2. **Select your service** (the main Budget Tracker app)
3. **Go to "Environment"** tab
4. **Click "Add Environment Variable"** for each variable:
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - `SMTP_SECURE` = `false`
   - `SMTP_USER` = `your-email@gmail.com`
   - `SMTP_PASS` = `your-16-character-app-password` (no spaces)
   - `SMTP_FROM` = `your-email@gmail.com`

### Step 4: Verify Configuration

#### Check Server Logs:

After restarting your server, you should see:
```
✅ Email service configured with SMTP
```

If you see:
```
⚠️  Email service not configured - OTPs will be logged to console only
```

Then your environment variables are not set correctly.

#### Test Email Sending:

1. **Log into your Budget Tracker web app**
2. **Go to `/mcp-connection`** page
3. **Click "Send Verification Code"**
4. **Check your email inbox** (and spam folder) for the OTP code

Or use the test endpoint:
- Make a POST request to `/api/mcp/test-email` (while logged in)
- This will send a test email to verify SMTP is working

## Common Issues and Solutions

### Issue 1: "Authentication failed" error

**Solution:**
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Remove any spaces from the App Password
- Double-check the password was copied correctly

### Issue 2: "Connection timeout" error

**Solution:**
- Check your firewall settings
- Verify `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`
- Try using port 465 with `SMTP_SECURE=true` instead

### Issue 3: Emails not arriving

**Solution:**
- Check spam/junk folder
- Verify the recipient email address is correct
- Check server logs for error messages
- Verify SMTP credentials are correct
- Make sure the email address in your profile matches the one you're sending to

### Issue 4: "Less secure app access" error

**Solution:**
- Don't use "Less secure app access" - it's deprecated
- Use App Passwords instead (as described in this guide)
- Make sure 2-Step Verification is enabled

## Security Best Practices

1. **Never commit your `.env` file** to Git
2. **Use App Passwords** instead of your main Gmail password
3. **Rotate App Passwords** periodically (every 90 days recommended)
4. **Use environment variables** in production, not hardcoded values
5. **Restrict App Password access** - only grant access to trusted applications

## Testing Your Setup

### Method 1: Request OTP from Web App
1. Log in to your Budget Tracker
2. Go to `/mcp-connection`
3. Click "Send Verification Code"
4. Check your email for the code

### Method 2: Test Endpoint (API)
```bash
# While logged in, make a POST request to:
POST /api/mcp/test-email

# This will send a test email to your account email
```

### Method 3: Check Server Logs
After requesting an OTP, check your server logs:
- ✅ `✅ Email service configured with SMTP` - Configuration is correct
- ✅ `✅ OTP email sent successfully to your-email@gmail.com` - Email was sent
- ❌ `❌ Failed to send OTP email: ...` - Check the error message

## Next Steps

Once SMTP is configured:
1. Restart your server (if running locally)
2. Test by requesting an OTP
3. Verify you receive the email
4. The OTP code will no longer appear in the UI (only in emails)

## Need Help?

If you're still having issues:
1. Check the server logs for specific error messages
2. Verify all environment variables are set correctly
3. Test with a different email provider (SendGrid, AWS SES) if Gmail doesn't work
4. See `EMAIL_SETUP.md` for alternative email providers

