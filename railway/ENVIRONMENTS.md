# Railway Staging & Production Setup

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Railway Project                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │   STAGING BRANCH    │         │  PRODUCTION BRANCH  │       │
│  │   (staging branch)  │         │  (main branch)      │       │
│  ├─────────────────────┤         ├─────────────────────┤       │
│  │                     │         │                     │       │
│  │  ┌───────────────┐  │         │  ┌───────────────┐  │       │
│  │  │ Frontend      │  │         │  │ Frontend      │  │       │
│  │  │ .onrailway.app │  │         │  │ custom domain │  │       │
│  │  └───────┬───────┘  │         │  └───────┬───────┘  │       │
│  │          │           │         │          │           │       │
│  │  ┌───────▼───────┐  │         │  ┌───────▼───────┐  │       │
│  │  │ Backend API   │  │         │  │ Backend API   │  │       │
│  │  │ .onrailway.app │  │         │  │ custom domain │  │       │
│  │  └───────┬───────┘  │         │  └───────┬───────┘  │       │
│  │          │           │         │          │           │       │
│  │  ┌───────▼───────┐  │         │  ┌───────▼───────┐  │       │
│  │  │ Neon DB      │  │         │  │ Neon DB      │  │       │
│  │  │ (staging)    │  │         │  │ (production) │  │       │
│  │  └───────────────┘  │         │  └───────────────┘  │       │
│  │                     │         │                     │       │
│  └─────────────────────┘         └─────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Setup

### 1. Create Railway Projects

You need **2 separate Railway projects**:

#### Project 1: Staging
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set **deploy branch** to `staging`

#### Project 2: Production
1. Create another "New Project" from the same repo
2. Set **deploy branch** to `main`

---

### 2. Backend Environment Variables

#### Staging Backend:
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon staging DB URL |
| `JWT_SECRET` | Generate random string |
| `VETOR_API_KEY` | Your Base44 API key |
| `VETOR_BASE_URL` | `https://app.base44.com/api/apps/687412c6a963138588a2720b` |
| `NEON_AUTH_BASE_URL` | Neon Auth URL |
| `NODE_ENV` | `staging` |

#### Production Backend:
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon production DB URL |
| `JWT_SECRET` | Different random string |
| `VETOR_API_KEY` | Same Base44 API key |
| `VETOR_BASE_URL` | `https://app.base44.com/api/apps/687412c6a963138588a2720b` |
| `NEON_AUTH_BASE_URL` | Neon Auth URL |
| `NODE_ENV` | `production` |

---

### 3. Frontend Environment Variables

#### Staging Frontend:
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://staging-backend.onrailway.app` |
| `NEXT_PUBLIC_ENVIRONMENT` | `staging` |
| `NEON_AUTH_BASE_URL` | Neon Auth URL |
| `NEON_AUTH_COOKIE_SECRET` | Generate random string |

#### Production Frontend:
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` (custom domain) |
| `NEXT_PUBLIC_ENVIRONMENT` | `production` |
| `NEON_AUTH_BASE_URL` | Neon Auth URL |
| `NEON_AUTH_COOKIE_SECRET` | Different random string |

---

### 4. Custom Domains (Recommended)

#### Production Domains:
```
Frontend:  app.vetorimobi.com.br  → Railway frontend
Backend:   api.vetorimobi.com.br  → Railway backend
```

#### Staging Domains:
```
Frontend:  staging.vetorimobi.com.br  → Railway frontend
Backend:   staging-api.vetorimobi.com.br → Railway backend
```

---

### 5. Git Branches Strategy

```bash
# Create staging branch
git checkout -b staging
git push origin staging

# Your branches:
# main      → Production deployment (auto-deploys)
# staging   → Staging deployment (auto-deploys)
# feature/* → PR to staging for review
```

---

### 6. Deployment Workflow

```
1. Feature Development:
   your-branch → PR to staging → merge to staging

2. Test on Staging:
   staging branch → auto-deploys to Railway staging

3. Promote to Production:
   staging → PR to main → merge to main

4. Production Deploy:
   main branch → auto-deploys to Railway production
```

---

### 7. Copy `railway.toml` to Your Projects

Copy the config files to your project roots:

```bash
# Backend staging config
cp railway/backend/railway.staging.toml vetor-core-backend/railway.toml

# Backend production config (commit to main branch)
cp railway/backend/railway.toml vetor-core-backend/railway.toml

# Frontend staging config
cp railway/frontend/railway.staging.toml dashboard-design/railway.toml

# Frontend production config (commit to main branch)
cp railway/frontend/railway.toml dashboard-design/railway.toml
```

---

### 8. Update package.json Scripts

Ensure both backend and frontend have these scripts:

**Backend (`vetor-core-backend/package.json`):**
```json
{
  "scripts": {
    "start": "bun run dist/server.js",
    "build": "bun build src/server.ts --outdir dist --target bun",
    "dev": "bun --watch run src/server.ts"
  }
}
```

**Frontend (`dashboard-design/package.json`):**
```json
{
  "scripts": {
    "start": "bun run next start",
    "build": "bun run next build",
    "dev": "bun run next dev"
  }
}
```

---

### 9. Testing Checklist

- [ ] Staging frontend connects to staging backend
- [ ] Staging backend connects to staging database
- [ ] Production frontend connects to production backend
- [ ] Production backend connects to production database
- [ ] Custom domains are configured
- [ ] CORS allows your custom domains
- [ ] Environment variables are correct

---

### 10. Quick Commands

```bash
# Deploy to staging
git checkout staging
git merge your-feature-branch
git push origin staging

# Promote to production
git checkout main
git merge staging
git push origin main
```

---

## Useful Railway Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# View logs
railway logs

# Open dashboard
railway open

# Set environment variable
railway variables set JWT_SECRET=your-secret

# List all variables
railway variables
```
