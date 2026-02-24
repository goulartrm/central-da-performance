#!/bin/bash

# Railway Deployment Setup Script
# This script helps you set up staging and production on Railway

set -e

echo "🚀 Railway Staging & Production Setup"
echo "======================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "📝 Please login to Railway..."
railway login

echo ""
echo "📋 Setting up projects..."
echo ""

# Function to create project
create_project() {
    local project_name=$1
    local branch=$2

    echo "Creating project: $project_name (branch: $branch)"
    echo "  1. Go to https://railway.app/new"
    echo "  2. Click 'Deploy from GitHub repo'"
    echo "  3. Select your repository"
    echo "  4. Set deploy branch to: $branch"
    echo "  5. Run: railway link"
    echo "  6. Copy the project ID from: railway project"
    echo ""
}

echo "🔧 SETUP CHECKLIST"
echo "=================="
echo ""
echo "1️⃣ CREATE STAGING PROJECT"
echo "   Project name: vetor-core-staging"
create_project "vetor-core-staging" "staging"

echo "2️⃣ CREATE PRODUCTION PROJECT"
echo "   Project name: vetor-core-production"
create_project "vetor-core-production" "main"

echo ""
echo "3️⃣ CREATE GIT BRANCHES"
echo "   git checkout -b staging"
echo "   git push origin staging"
echo ""

echo "4️⃣ COPY CONFIG FILES"
echo "   # Staging branch:"
echo "   git checkout staging"
echo "   cp railway/backend/railway.staging.toml vetor-core-backend/railway.toml"
echo "   cp railway/frontend/railway.staging.toml dashboard-design/railway.toml"
echo "   git add ."
echo "   git commit -m 'Add Railway staging config'"
echo "   git push origin staging"
echo ""
echo "   # Production (main) branch:"
echo "   git checkout main"
echo "   cp railway/backend/railway.toml vetor-core-backend/railway.toml"
echo "   cp railway/frontend/railway.toml dashboard-design/railway.toml"
echo "   git add ."
echo "   git commit -m 'Add Railway production config'"
echo "   git push origin main"
echo ""

echo "5️⃣ ENVIRONMENT VARIABLES"
echo ""
echo "STAGING Backend Variables:"
echo "   railway variables set DATABASE_URL=your-neon-staging-url"
echo "   railway variables set JWT_SECRET=$(openssl rand -base64 32)"
echo "   railway variables set VETOR_API_KEY=your-api-key"
echo "   railway variables set NODE_ENV=staging"
echo "   railway variables set ALLOWED_ORIGINS=https://staging.vetorimobi.com.br"
echo ""
echo "PRODUCTION Backend Variables:"
echo "   railway variables set DATABASE_URL=your-neon-production-url"
echo "   railway variables set JWT_SECRET=$(openssl rand -base64 32)"
echo "   railway variables set VETOR_API_KEY=your-api-key"
echo "   railway variables set NODE_ENV=production"
echo "   railway variables set ALLOWED_ORIGINS=https://app.vetorimobi.com.br"
echo ""

echo "6️⃣ DEPLOYMENT COMMANDS"
echo ""
echo "Deploy to staging:"
echo "   git checkout staging"
echo "   git merge your-feature-branch"
echo "   git push origin staging"
echo ""
echo "Promote to production:"
echo "   git checkout main"
echo "   git merge staging"
echo "   git push origin main"
echo ""

echo "✅ Setup complete! Follow the checklist above."
echo ""
echo "📖 Read railway/ENVIRONMENTS.md for detailed instructions."
