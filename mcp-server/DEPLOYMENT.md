# MCP Server Production Deployment Guide

This guide explains how to deploy the Budget Track MCP server from local to production.

## Overview

The MCP server has two modes:
- **Local (stdio)**: `src/index.ts` - For local development with Claude Desktop/Cursor
- **Production (HTTP)**: `src/server.ts` - For production deployment as an HTTP service

## Production Deployment Options

### Option 1: Deploy to Render

1. **Create a new Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure the service:**
   - **Name**: `budget-track-mcp-server`
   - **Root Directory**: `mcp-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm run start:prod`

3. **Set Environment Variables:**
   - `DATABASE_URL`: Your production database connection string
   - `PORT`: (Optional, defaults to 3001)
   - `NODE_ENV`: `production`

4. **Deploy**: Render will automatically deploy on every push to main branch

### Option 2: Deploy to Railway

1. **Create a new project on Railway**
   - Go to [Railway Dashboard](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Configure the service:**
   - **Root Directory**: `mcp-server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

3. **Set Environment Variables:**
   - `DATABASE_URL`: Your production database connection string
   - `PORT`: (Railway will set this automatically)
   - `NODE_ENV`: `production`

### Option 3: Deploy to VPS/Cloud Server

1. **SSH into your server**

2. **Clone and setup:**
   ```bash
   git clone https://github.com/Piranav-unique/budget_track.git
   cd budget_track/mcp-server
   npm install
   npm run build
   ```

3. **Create a `.env` file:**
   ```env
   DATABASE_URL=your_production_database_url
   NODE_ENV=production
   PORT=3001
   ```

4. **Use PM2 to run the server:**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name mcp-server
   pm2 save
   pm2 startup
   ```

5. **Set up reverse proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Testing Production Deployment

Once deployed, test the endpoints:

1. **Health Check:**
   ```bash
   curl https://your-domain.com/health
   ```

2. **List Tools:**
   ```bash
   curl https://your-domain.com/mcp/tools
   ```

3. **Call a Tool:**
   ```bash
   curl -X POST https://your-domain.com/mcp/tools/call \
     -H "Content-Type: application/json" \
     -d '{"name": "get_budget_summary", "arguments": {"userId": 1}}'
   ```

## Connecting MCP Clients to Production Server

### For Claude Desktop

Update your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "budget-track": {
      "url": "https://your-domain.com/mcp",
      "transport": "sse"
    }
  }
}
```

### For Cursor

In Cursor Settings → Features → MCP:
- **Name**: Budget Track
- **Type**: URL
- **URL**: `https://your-domain.com/mcp`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | Environment (production/development) | No |

## Security Considerations

1. **Use HTTPS**: Always use HTTPS in production
2. **Authentication**: Consider adding API key authentication for production
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **CORS**: Configure CORS to only allow your MCP clients

## Monitoring

- Set up logging (e.g., Winston, Pino)
- Monitor server health with `/health` endpoint
- Set up alerts for errors and downtime

