# Deployment Guide

This guide will help you deploy your Money Track application to various hosting platforms.

## Prerequisites

- Your code pushed to GitHub
- Environment variables ready:
  - `DATABASE_URL` - PostgreSQL connection string
  - `GROQ_API_KEY` - Groq AI API key
  - `SESSION_SECRET` - Random secret string (optional but recommended)

## Deployment Options

### 1. Railway (Recommended - Easiest)

1. Go to [Railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables in the "Variables" tab:
   - `DATABASE_URL`
   - `GROQ_API_KEY`
   - `SESSION_SECRET` (optional)
6. Railway will automatically detect the build and start commands
7. Your app will be live at `https://your-app-name.up.railway.app`

**Railway automatically:**
- Detects Node.js
- Runs `npm install`
- Runs `npm run build`
- Runs `npm start`

### 2. Render

1. Go to [Render.com](https://render.com)
2. Sign up/login with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: money-track (or your choice)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. Add environment variables:
   - `DATABASE_URL`
   - `GROQ_API_KEY`
   - `SESSION_SECRET` (optional)
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render sets this automatically)
7. Click "Create Web Service"
8. Your app will be live at `https://your-app-name.onrender.com`

### 3. Fly.io

1. Install Fly CLI: `npm install -g @fly/cli`
2. Login: `fly auth login`
3. Initialize: `fly launch`
4. Follow prompts and deploy: `fly deploy`
5. Set secrets:
   ```bash
   fly secrets set DATABASE_URL="your-database-url"
   fly secrets set GROQ_API_KEY="your-api-key"
   fly secrets set SESSION_SECRET="your-secret"
   ```

### 4. DigitalOcean App Platform

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App" → "GitHub"
3. Select your repository
4. Configure:
   - **Build Command**: `npm run build`
   - **Run Command**: `npm start`
5. Add environment variables
6. Deploy

### 5. ESDS Cloud (eNlight Managed Cloud)

ESDS is an Indian cloud provider offering managed cloud services. Here's how to deploy:

#### Option A: Using ESDS Cloud Console (Recommended)

1. **Sign up for ESDS Account**
   - Go to [ESDS Cloud](https://www.esds.co.in)
   - Register for eNlight Managed Cloud (one-time fee of ₹100 + GST)
   - Complete the account creation process

2. **Create a Cloud Instance**
   - Log in to your ESDS dashboard
   - Create a new cloud instance/VPS
   - Choose Linux (Ubuntu 22.04 or similar)
   - Select appropriate resources (RAM, CPU, Storage)

3. **Connect to Your Server**
   - Use SSH to connect to your server
   - Or use ESDS's web-based terminal

4. **Install Required Software**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 20.x
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL client (if needed)
   sudo apt-get install -y postgresql-client
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Git
   sudo apt-get install -y git
   ```

5. **Clone Your Repository**
   ```bash
   cd /var/www
   git clone https://github.com/Piranav-unique/budget_track.git
   cd budget_track
   ```

6. **Install Dependencies and Build**
   ```bash
   npm install
   npm run build
   ```

7. **Set Environment Variables**
   ```bash
   # Create .env file
   nano .env
   ```
   
   Add your environment variables:
   ```env
   DATABASE_URL=postgresql://postgres:Pranavrichu%402@db.ngdlwfkdgqfssxvgbrlt.supabase.co:5432/postgres
   GROQ_API_KEY=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
   SESSION_SECRET=your-generated-secret-here
   NODE_ENV=production
   PORT=3000
   ```

8. **Start the Application with PM2**
   ```bash
   pm2 start dist/server/node-build.mjs --name money-track
   pm2 save
   pm2 startup
   ```

9. **Configure Firewall**
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw enable
   ```

10. **Set Up Nginx Reverse Proxy (Optional but Recommended)**
    ```bash
    sudo apt-get install -y nginx
    sudo nano /etc/nginx/sites-available/money-track
    ```
    
    Add this configuration:
    ```nginx
    server {
        listen 80;
        server_name your-domain.com;
        
        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    
    Enable the site:
    ```bash
    sudo ln -s /etc/nginx/sites-available/money-track /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

11. **Set Up SSL Certificate (Optional)**
    ```bash
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

#### Option B: Using Docker on ESDS

If ESDS supports Docker:

1. Follow steps 1-3 from Option A
2. Install Docker:
   ```bash
   sudo apt-get install -y docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   ```
3. Build and run:
   ```bash
   docker build -t money-track .
   docker run -d -p 3000:3000 \
     -e DATABASE_URL="your-database-url" \
     -e GROQ_API_KEY="your-api-key" \
     -e SESSION_SECRET="your-secret" \
     --name money-track \
     money-track
   ```

#### ESDS-Specific Notes

- **Port Configuration**: ESDS may require you to open ports in their firewall panel
- **Domain Setup**: Configure your domain DNS to point to your ESDS server IP
- **Monitoring**: Use PM2 monitoring: `pm2 monit`
- **Logs**: Check logs with `pm2 logs money-track`
- **Auto-restart**: PM2 will automatically restart your app if it crashes

### 6. Docker Deployment

If you want to deploy using Docker:

```bash
# Build the image
docker build -t money-track .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e GROQ_API_KEY="your-api-key" \
  -e SESSION_SECRET="your-secret" \
  money-track
```

## Environment Variables

Make sure to set these in your hosting platform:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ Yes | Groq AI API key for categorization |
| `SESSION_SECRET` | ⚠️ Recommended | Random string for session encryption |
| `NODE_ENV` | ⚠️ Optional | Set to `production` |
| `PORT` | ⚠️ Optional | Port number (defaults to 3000) |

## Generate SESSION_SECRET

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Troubleshooting

### Build fails
- Make sure all dependencies are in `package.json`
- Check that Node.js version is 18+ (most platforms use 18 or 20)

### Database connection fails
- Verify `DATABASE_URL` is correct
- Check if your database allows connections from the hosting platform's IP
- For Supabase, you may need to allow connections in the dashboard

### App crashes on start
- Check logs in your hosting platform's dashboard
- Verify all environment variables are set
- Make sure the build completed successfully

## Post-Deployment

1. Test your API endpoints: `https://your-app.com/api/ping`
2. Test database connection by adding an expense
3. Test AI categorization feature
4. Monitor logs for any errors

## Need Help?

- Check your hosting platform's documentation
- Review application logs in the dashboard
- Test locally first: `npm run build && npm start`

