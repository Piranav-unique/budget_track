# MCP Server User Authentication Guide

## Overview

The MCP server now supports user authentication via email OTP (One-Time Password) verification. This ensures that when users connect ChatGPT to the MCP server, their data is properly linked to their account.

## How It Works

### Flow Diagram

```
1. User logs into web app
   ↓
2. User navigates to /mcp-connection page
   ↓
3. User clicks "Send Verification Code"
   ↓
4. System sends 6-digit OTP to user's email
   ↓
5. User enters OTP code
   ↓
6. System verifies OTP and generates MCP token
   ↓
7. User copies MCP connection URL (with token)
   ↓
8. User pastes URL in ChatGPT MCP settings
   ↓
9. ChatGPT connects using token
   ↓
10. MCP server validates token and uses correct user_id
```

## For Users

### Step 1: Access MCP Connection Page

1. Log into your Budget Tracker account
2. Navigate to `/mcp-connection` (or add a link in your settings/navigation)
3. Make sure you have an email address in your profile

### Step 2: Request OTP

1. Click "Send Verification Code"
2. Check your email for a 6-digit code
3. The code expires in 10 minutes

### Step 3: Verify OTP

1. Enter the 6-digit code from your email
2. Click "Verify Code"
3. If successful, you'll receive an MCP token

### Step 4: Connect to ChatGPT

1. Copy the MCP Server URL (it includes your token)
2. In ChatGPT, go to MCP server settings
3. Click "New App" or "Add MCP Server"
4. Paste the URL in "MCP Server URL" field
5. Set Authentication to "No Auth"
6. Click "Create"

## For Developers

### Database Schema

The system uses two new tables:

#### `mcp_otp_codes`
- Stores OTP codes for verification
- Codes expire after 10 minutes
- Codes are marked as used after verification

#### `mcp_tokens`
- Stores MCP authentication tokens
- Tokens expire after 30 days
- Each token is linked to a user_id

### API Endpoints

#### `POST /api/mcp/request-otp`
- **Auth**: Required (user must be logged in)
- **Response**: `{ message: string, email: string }`
- Sends OTP code to user's email

#### `POST /api/mcp/verify-otp`
- **Auth**: Required
- **Body**: `{ code: string }`
- **Response**: `{ token: string, message: string, expiresIn: string }`
- Verifies OTP and returns MCP token

#### `GET /api/mcp/token-status`
- **Auth**: Required
- **Response**: `{ hasEmail: boolean, hasToken: boolean, message: string }`
- Returns status of user's MCP connection setup

### MCP Server Token Usage

The MCP server accepts tokens in two ways:

1. **Query Parameter**: `https://your-server.com/sse?token=YOUR_TOKEN`
2. **Authorization Header**: `Authorization: Bearer YOUR_TOKEN`

When a token is provided:
- Server validates the token
- Extracts user_id from token
- Uses that user_id for all operations
- Falls back to user_id=1 if token is invalid or missing

### Security Considerations

1. **OTP Expiration**: OTP codes expire after 10 minutes
2. **Token Expiration**: MCP tokens expire after 30 days
3. **One-Time Use**: OTP codes can only be used once
4. **Email Verification**: Users must have a verified email address
5. **Token Storage**: Tokens are stored securely in the database

### Email Service

Currently, the email service logs OTP codes to the console in development mode. For production:

1. Configure SMTP settings in environment variables:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`

2. Uncomment the email sending code in `server/services/email-service.ts`

3. Or integrate with a service like:
   - SendGrid
   - AWS SES
   - Nodemailer with Gmail
   - Resend

## Troubleshooting

### "Email address required"
- User needs to add an email to their profile
- Navigate to Settings/Profile to add email

### "Invalid or expired OTP code"
- OTP codes expire after 10 minutes
- Request a new code
- Make sure you're entering all 6 digits

### "Token not working in ChatGPT"
- Check that the token is included in the URL
- Format: `https://your-server.com/sse?token=YOUR_TOKEN`
- Token expires after 30 days - generate a new one if needed

### OTP not received
- Check spam folder
- Verify email address is correct
- In development, check server console logs for the OTP code

## Future Enhancements

- [ ] Real email service integration
- [ ] Token refresh mechanism
- [ ] Revoke token functionality
- [ ] Multiple active tokens per user
- [ ] Token usage analytics

