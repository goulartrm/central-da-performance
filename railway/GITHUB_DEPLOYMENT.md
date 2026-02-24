# Railway Deployment from GitHub

## Step 1: Prepare Your Repository

First, commit the Railway config files:

```bash
git add railway/backend/railway.toml railway/frontend/railway.toml
git add vetor-core-backend/railway.toml dashboard-design/railway.toml
git add railway/ENVIRONMENTS.md
git commit -m "Add Railway deployment configs"
git push origin main
```

## Step 2: Set Up in Railway Dashboard

1. Go to https://railway.app/project/7d136e73-7ec1-4939-b0b4-ffac945b1028

2. Click **"New Service"** → **"Deploy from GitHub repo"**

3. Select your repository

## Step 3: Add Backend Service

1. Click **"New Service"** → **"Deploy from GitHub repo"**
2. Select your repository
3. **Root Directory**: `vetor-core-backend`
4. Click **"Deploy"**

5. Once deployed, add environment variables:
   - Click on the backend service
   - Go to **Variables** tab
   - Add these variables:

```
DATABASE_URL = your_neon_database_url
JWT_SECRET = ssYZmvwSOTlOLnIaV6jkS/03lCqc93ZWArr+RwTaB1A=
VETOR_API_KEY = bf3db725fddd4408a53919eea6e357a6
VETOR_BASE_URL = https://app.base44.com/api/apps/687412c6a963138588a2720b
NEON_AUTH_BASE_URL = https://ep-steep-art-ac6xz5mt.neonauth.sa-east-1.aws.neon.tech/neondb/auth
NODE_ENV = production
ALLOWED_ORIGINS = https://your-frontend-domain.railway.app
```

## Step 4: Add Frontend Service

1. Click **"New Service"** → **"Deploy from GitHub repo"**
2. Select your repository
3. **Root Directory**: `dashboard-design`
4. Click **"Deploy"**

5. Add environment variables:

```
NEXT_PUBLIC_API_URL = https://your-backend-domain.railway.app
NEON_AUTH_BASE_URL = https://ep-steep-art-ac6xz5mt.neonauth.sa-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET = generate_another_secret
NEXT_PUBLIC_ENVIRONMENT = production
```

## Step 5: Get Your URLs

After deployment, Railway will give you:
- Backend: `https://something.up.railway.app`
- Frontend: `https://something-else.up.railway.app`

1. Copy the backend URL
2. Update the frontend's `NEXT_PUBLIC_API_URL` variable
3. Redeploy the frontend

## Step 6: Set Custom Domains (Optional)

1. Go to your project settings
2. Click **"Domains"**
3. Add your custom domains:
   - `api.vetorimobi.com.br` → Backend
   - `app.vetorimobi.com.br` → Frontend

4. Update your DNS to point to Railway

## Environment Variables Template

### Backend (production)
```
DATABASE_URL=postgresql://neondb_owner:npg_Vm1sPilxTh2K@ep-steep-art-ac6xz5mt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=ssYZmvwSOTlOLnIaV6jkS/03lCqc93ZWArr+RwTaB1A=
VETOR_API_KEY=bf3db725fddd4408a53919eea6e357a6
VETOR_BASE_URL=https://app.base44.com/api/apps/687412c6a963138588a2720b
NEON_AUTH_BASE_URL=https://ep-steep-art-ac6xz5mt.neonauth.sa-east-1.aws.neon.tech/neondb/auth
NODE_ENV=production
ALLOWED_ORIGINS=https://app.vetorimobi.com.br,https://staging.vetorimobi.com.br
```

### Frontend (production)
```
NEXT_PUBLIC_API_URL=https://api.vetorimobi.com.br
NEON_AUTH_BASE_URL=https://ep-steep-art-ac6xz5mt.neonauth.sa-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=generate_new_secret_here
NEXT_PUBLIC_ENVIRONMENT=production
```

## Quick Checklist

- [ ] Commit railway.toml files to git
- [ ] Push to GitHub
- [ ] Create backend service from GitHub
- [ ] Add backend environment variables
- [ ] Create frontend service from GitHub
- [ ] Add frontend environment variables
- [ ] Update frontend API URL with backend domain
- [ ] Test the deployment
- [ ] Set up custom domains (optional)
