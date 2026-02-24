# Vetor Core - Setup Guide

This guide will walk you through setting up the Vetor Core dashboard from scratch. Follow each step carefully.

## Prerequisites

Before you begin, make sure you have installed:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/downloads)
- **A code editor** - Recommended: [VS Code](https://code.visualstudio.com/)

---

## Step 1: Set Up Neon Database

Neon is a serverless PostgreSQL database that we use for this project.

### 1.1 Create a Neon Account

1. Go to https://neon.tech
2. Click **"Sign up"** and create an account (you can use Google OAuth)
3. Verify your email if required

### 1.2 Create a New Project

1. After logging in, click **"Create a project"**
2. Enter a project name (e.g., `vetor-core`)
3. Choose a region close to you (e.g., `aws-us-east-1`)
4. Click **"Create project"**

### 1.3 Get Your Connection String

1. Once the project is created, you'll see a **Connection Details** popup
2. Copy the **Connection string** - it looks like:
   ```
   postgresql://username:password@ep-cool-region.aws.neon.tech/database?sslmode=require
   ```
3. **Save this string** - you'll need it for the `.env` file

### 1.4 Alternative: Use Neon CLI (Recommended for Claude Code Users)

If you're using Claude Code, Neon offers a CLI that makes setup even easier:

1. Install the Neon CLI globally:
   ```bash
   npm install -g neonctl
   ```

2. Initialize and link to your Neon project:
   ```bash
   cd "C:\Users\ricar\OneDrive\Área de Trabalho\central da performance\vetor-core-backend"
   npx neonctl@latest init
   ```

3. Follow the prompts to link your Neon account. This will:
   - Automatically detect or create a Neon project
   - Set up the connection in your local environment
   - Configure Drizzle to work with Neon

4. Your `DATABASE_URL` will be automatically configured!

### 1.5 (Optional) Install VS Code Extension

For easy database viewing, install the [Neon VS Code extension](https://marketplace.visualstudio.com/items?itemName=neondb.neon).

---

## Step 2: Get Vetor Imobi API Key

The dashboard connects to Vetor Imobi (Base44) to fetch deals, brokers, and properties.

### 2.1 Find Your API Key

1. Contact your Vetor Imobi administrator or check the Base44 dashboard
2. The API key is typically found in:
   - Base44 Settings → API Keys
   - Or provided by your system administrator

### 2.2 Note the Base URL

The default Base44 API URL is:
```
https://app.base44.com/api/apps/687412c6a963138588a2720b
```

If yours is different, make a note of it.

---

## Step 3: Get Mada AI Credentials

Mada AI provides conversation summaries and sentiment analysis via Supabase.

### 3.1 Find Your Supabase Credentials

1. Log in to your Supabase project dashboard
2. Go to **Project Settings** → **API**
3. Copy the following:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **service_role key** (NOT the anon key - use the service role for full access)

---

## Step 4: Set Up Google OAuth (Optional)

If you want to enable Google login:

### 4.1 Create a Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**

### 4.2 Create OAuth 2.0 Credentials

1. Click **+ Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Vetor Core Dashboard`
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - (For production) `https://your-domain.com/api/auth/callback/google`
5. Click **Create**

### 4.3 Save Your Credentials

Copy the **Client ID** and **Client Secret** - you'll need them for `.env`.

---

## Step 5: Configure Environment Variables

Now let's put everything together.

### 5.1 Create the `.env` File

1. Navigate to the backend folder:
   ```bash
   cd "C:\Users\ricar\OneDrive\Área de Trabalho\central da performance\vetor-core-backend"
   ```

2. Create a file named `.env` (no extension)

3. Copy the following into the file and **replace the placeholder values**:

```env
# Database (Neon)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
# Replace with your Neon connection string from Step 1

# JWT Secret - Generate a random string
JWT_SECRET=your-random-secret-key-min-32-characters

# Mada Integration (Supabase)
MADA_SUPABASE_URL=https://your-project.supabase.co
# Replace with your Supabase project URL from Step 3

MADA_SUPABASE_KEY=your-service-role-key
# Replace with your Supabase service_role key from Step 3

# Vetor Imobi Integration (Base44 API)
VETOR_API_KEY=your-vetor-api-key
# Replace with your Vetor API key from Step 2

VETOR_BASE_URL=https://app.base44.com/api/apps/687412c6a963138588a2720b
# Only change if your Base URL is different

# Google OAuth (Optional - only if using Google login)
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Cron Jobs (Optional - customize schedules)
MADA_SYNC_CRON=*/5 * * * *
VETOR_SYNC_CRON=*/30 * * * *
```

### 5.2 Generate a Secure JWT Secret

For the JWT_SECRET, you can generate a secure random string using PowerShell:

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## Step 6: Install Dependencies and Run Migrations

### 6.1 Install Backend Dependencies

Open a terminal in the backend folder and run:

```bash
cd "C:\Users\ricar\OneDrive\Área de Trabalho\central da performance\vetor-core-backend"
npm install
```

### 6.2 Run Database Migrations

**Option A: Quick Method (Recommended)**
```bash
npm run db:push
```

**Option B: Using Neon CLI**
If you used `npx neonctl@latest init` in Step 1, your database is already connected! Just run:
```bash
npm run db:push
```

**Note:** We use `db:push` for development which directly pushes the schema. For production, you would use `npm run db:migrate` after generating migrations with `npm run db:generate`.

### 6.3 Verify the Database

You can verify the tables were created by running:

```bash
npm run db:studio
```

This opens Drizzle Studio - a visual database explorer. You should see these tables:
- `organizations`
- `users`
- `brokers`
- `deals`
- `activity_logs`
- `sync_logs`

---

## Step 7: Start the Backend Server

With everything configured, start the backend:

```bash
cd "C:\Users\ricar\OneDrive\Área de Trabalho\central da performance\vetor-core-backend"
npm run dev
```

You should see:
```
🚀 Vetor Core Backend running on http://0.0.0.0:3000
📊 Health check: http://0.0.0.0:3000/health
```

Test the health check in another terminal:
```bash
curl http://localhost:3000/health
```

Response should be:
```json
{"status":"ok","timestamp":"2025-01-XX..."}
```

---

## Step 8: Start the Frontend

In a **new terminal** (keep the backend running):

```bash
cd "C:\Users\ricar\OneDrive\Área de Trabalho\central da performance\dashboard-design"
npm install
npm run dev
```

The frontend will start at http://localhost:3000

---

## Step 9: Initial Data Sync

When you first start the application, the database will be empty. To populate it with data:

### Option 1: Wait for Automatic Sync

The cron jobs will automatically:
- Sync Mada data every 5 minutes
- Sync Vetor Imobi data every 30 minutes

### Option 2: Trigger Manual Sync

Send a POST request to trigger an immediate sync:

```bash
curl -X POST http://localhost:3000/api/sync -H "Content-Type: application/json" -d "{\"source\":\"vetor_imobi\"}"
curl -X POST http://localhost:3000/api/sync -H "Content-Type: application/json" -d "{\"source\":\"mada\"}"
```

Check sync logs:
```bash
curl http://localhost:3000/api/sync/logs
```

---

## Troubleshooting

### "Database connection failed"

- Verify your `DATABASE_URL` is correct
- Check that your Neon database is active (not paused)
- Ensure `sslmode=require` is in the connection string

### "MADA_SUPABASE_URL is not set"

- Make sure you created the `.env` file in the `vetor-core-backend` folder
- Verify the variable names match exactly (no extra spaces)

### "Port 3000 already in use"

- Either stop the process using port 3000, or
- Change the `PORT` in your `.env` file to `3001` or another port

### Frontend shows empty data

- Check that the backend is running
- Trigger a manual sync to populate the database
- Check browser console for API errors

### CORS errors

- Verify `CORS_ORIGIN` in your `.env` matches your frontend URL
- Default is `http://localhost:3000` for both frontend and backend

---

## Next Steps

Once everything is running:

1. **Access the dashboard** at http://localhost:3000
2. **Review the KPI cards** on the main dashboard
3. **Browse deals** in the "Negócios" section
4. **View brokers** in the "Corretores" section
5. **Check sync logs** in the settings or via API

---

## Production Deployment

For production deployment, you'll need to:

1. Use Railway or similar for the backend
2. Use Vercel for the frontend
3. Set up environment variables in the hosting platform
4. Use production-grade API keys (not development keys)
5. Enable proper authentication (Google OAuth or similar)

---

## Need Help?

If you encounter issues:

1. Check the terminal output for error messages
2. Verify all environment variables are set correctly
3. Ensure all services (Neon, Supabase, Base44) are accessible
4. Review the logs in the backend console

---

## Quick Reference

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3000/api |
| Health Check | http://localhost:3000/health |
| Database Studio | `npm run db:studio` in backend folder |

### Useful Commands

```bash
# Backend
cd vetor-core-backend
npm run dev          # Start development server
npm run build        # Build for production
npm run db:studio    # Open database explorer
npm run db:push      # Push schema to database

# Frontend
cd dashboard-design
npm run dev          # Start development server
npm run build        # Build for production
```
