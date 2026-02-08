# MCP Server Deployment Options

## Option 1: Deploy from Same Repository (Recommended) ✅

**Pros:**
- ✅ Single repository to manage
- ✅ Code stays in sync
- ✅ Easier to maintain
- ✅ Shared environment variables
- ✅ No need to duplicate code

**How to Deploy:**

### On Render:
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your existing GitHub repository: `https://github.com/Piranav-unique/budget_track.git`
4. Configure:
   - **Name**: `budget-track-mcp-server`
   - **Root Directory**: `mcp-server` ← Important!
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
5. Set environment variables (same `DATABASE_URL` as main app)
6. Deploy!

### On Railway:
1. Go to [Railway Dashboard](https://railway.app)
2. Create new project → "Deploy from GitHub repo"
3. Select your repository
4. Add a new service
5. Set **Root Directory** to `mcp-server`
6. Configure build/start commands
7. Set environment variables

**Result:** You'll have two services:
- `budget-track` (main app) - from root directory
- `budget-track-mcp-server` (MCP server) - from `mcp-server/` directory

---

## Option 2: Separate Repository (Not Recommended)

**When to use:**
- If you want completely independent versioning
- If different teams manage each service
- If you need different deployment schedules

**Pros:**
- Independent versioning
- Separate CI/CD pipelines
- Can deploy independently

**Cons:**
- ❌ More repositories to manage
- ❌ Code duplication risk
- ❌ Harder to keep in sync
- ❌ More complex setup

**How to do it:**
1. Create new repository: `budget-track-mcp-server`
2. Copy `mcp-server/` directory contents
3. Deploy from new repository
4. Keep both repos in sync manually

---

## Recommendation

**Use Option 1 (Same Repository)** because:
1. Your MCP server shares the same database
2. They're part of the same project
3. Easier to maintain and deploy
4. Render/Railway support subdirectory deployments

The `render.yaml` file in the root already supports both services!

