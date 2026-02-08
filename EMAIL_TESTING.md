# Email Testing Guide

Quick reference for testing email functionality in the Budget Tracker application.

## Quick Test

### Option 1: Standalone Script (Recommended)

**JavaScript:**
```bash
# Test configuration and connection
node scripts/test-email.js

# Test and send email
node scripts/test-email.js --send your-email@example.com
```

**TypeScript:**
```bash
# Test configuration and connection
npx ts-node scripts/test-email.ts

# Test and send email
npx ts-node scripts/test-email.ts --send your-email@example.com
```

### Option 2: API Endpoints

**1. Check Email Availability:**
```bash
GET /api/mcp/check-email
```

**Response:**
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

**2. Send Test Email:**
```bash
POST /api/mcp/test-email
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully to your-email@gmail.com. Check your inbox (and spam folder).",
  "availability": {
    "configured": true,
    "connectionTest": true,
    "details": { ... }
  }
}
```

## What Gets Tested

1. **Configuration Check**
   - Verifies all required environment variables are set
   - Shows which variables are missing (if any)

2. **Connection Test**
   - Tests SMTP server connection
   - Verifies authentication credentials
   - Provides helpful error messages if connection fails

3. **Email Sending Test** (optional)
   - Sends a test email to verify end-to-end functionality
   - Includes HTML and plain text versions
   - Shows message ID and server response

## Sample Code Usage

### In Your Application Code

```typescript
import { emailService } from './server/services/email-service';

// Check email availability
const availability = await emailService.checkEmailAvailability();
console.log('Email configured:', availability.configured);
console.log('Connection test:', availability.connectionTest);

// Send test email
const result = await emailService.sendTestEmail('test@example.com', 'Test User');
if (result.success) {
    console.log('Email sent:', result.message);
} else {
    console.error('Email failed:', result.error);
}
```

### In API Routes

```typescript
import { handleCheckEmail, handleTestEmail } from './routes/mcp-auth';

// Add routes
app.get('/api/mcp/check-email', handleCheckEmail);
app.post('/api/mcp/test-email', handleTestEmail);
```

## Troubleshooting

### Script Output Examples

**✅ Success:**
```
✅ All required environment variables are set!
✅ SMTP connection verified successfully!
✅ Test email sent successfully!
```

**❌ Configuration Missing:**
```
⚠️  Missing required environment variables!
   Required: SMTP_HOST, SMTP_USER, SMTP_PASS
```

**❌ Connection Failed:**
```
❌ SMTP connection verification failed!
  Error: Invalid login
💡 Common issues:
     - Incorrect email or password
     - For Gmail: Make sure you're using an App Password
```

## Environment Variables Required

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com  # Optional
```

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed setup instructions.

