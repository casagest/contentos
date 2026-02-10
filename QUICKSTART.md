# ContentOS — Quick Start Guide

## 🚀 Setup in 30 Minutes

### Step 1: Prerequisites
```bash
# Install pnpm (if not already)
npm install -g pnpm

# Install Supabase CLI
brew install supabase/tap/supabase  # macOS
# or: npm install -g supabase

# Install Turbo
pnpm install -g turbo
```

### Step 2: Create Project
```bash
# Clone/init the repo
git clone <your-repo-url> contentos
cd contentos

# Install dependencies
pnpm install
```

### Step 3: Setup Supabase
```bash
# Login to Supabase
supabase login

# Create new project (or link existing)
supabase init
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Step 4: Setup Meta Developer App
1. Go to https://developers.facebook.com/
2. Create new app → Type: "Business"
3. Add products: Facebook Login, Instagram Basic Display
4. Configure OAuth redirect: `http://localhost:3000/api/auth/callback/facebook`
5. Copy App ID and App Secret to `.env`

### Step 5: Setup Stripe
1. Go to https://dashboard.stripe.com/
2. Create products for each plan (Starter €19, Pro €49, Agency €99, Dental €79)
3. Copy API keys to `.env`

### Step 6: Run Development
```bash
# Copy env template
cp .env.example .env.local

# Fill in your keys
# Then start dev server
pnpm dev
```

## 📱 Platform API Registration Checklist

### Meta (Facebook + Instagram)
- [ ] Facebook Developer Account: https://developers.facebook.com/
- [ ] Create App (Business type)
- [ ] Add Facebook Login product
- [ ] Add Instagram Basic Display product  
- [ ] Configure OAuth redirect URIs
- [ ] Submit for App Review (for public access)
- [ ] Required permissions: pages_show_list, pages_read_engagement, 
      instagram_basic, instagram_manage_insights

### TikTok
- [ ] TikTok Developer Account: https://developers.tiktok.com/
- [ ] Create App
- [ ] Apply for Content Posting API access
- [ ] Configure OAuth redirect URIs

### YouTube  
- [ ] Google Cloud Console: https://console.cloud.google.com/
- [ ] Enable YouTube Data API v3
- [ ] Create OAuth 2.0 credentials
- [ ] Configure consent screen

### X/Twitter (Optional)
- [ ] X Developer Portal: https://developer.x.com/
- [ ] Create Project + App
- [ ] Choose tier: Basic ($200/mo) or Pro ($5,000/mo)
- [ ] Generate OAuth 2.0 credentials

## 🏗️ Development Workflow (Your Setup)

### Primary: Claude Code Web on GitHub
```bash
# Use Claude Code for major feature development
# Works with your existing GitHub workflow
```

### Secondary: Cursor + Claude Code Local
```bash
# Use for debugging and quick fixes
# 6 parallel terminals as usual
```

### Git Branch Strategy
```
main              → production
develop           → staging  
feature/coach     → AI Content Coach
feature/meta-api  → Meta integration
feature/scoring   → Algorithm scoring
feature/dental    → Dental vertical
```

## 📊 Development Priority Order

### Week 1-2: Foundation
```bash
# Terminal 1: Monorepo scaffold
# Terminal 2: Database schema + migrations
# Terminal 3: Auth system + OAuth flows
# Terminal 4: Meta Graph API integration
# Terminal 5: Landing page
# Terminal 6: Post ingestion pipeline
```

### Week 3-4: AI Engine
```bash
# Terminal 1: Claude API service
# Terminal 2: Romanian prompt engineering
# Terminal 3: Algorithm scoring engine
# Terminal 4: Content Coach chat UI
# Terminal 5: Content Composer UI
# Terminal 6: Embedding generation (pgvector)
```

### Week 5-6: Full Platform
```bash
# Terminal 1: TikTok API adapter
# Terminal 2: YouTube API adapter
# Terminal 3: Brain Dump tool
# Terminal 4: Analytics dashboard
# Terminal 5: Chrome extension
# Terminal 6: Account Researcher
```

### Week 7: Dental Vertical
```bash
# Terminal 1: Dental templates
# Terminal 2: CMSR compliance checker
# Terminal 3: Multi-language generation
# Terminal 4: MEDICALCOR-CORE integration
# Terminal 5: Treatment-to-content mapping
# Terminal 6: Testing + polish
```

### Week 8: Launch
```bash
# Terminal 1: Stripe billing
# Terminal 2: Onboarding flow
# Terminal 3: Production deployment
# Terminal 4: Beta user onboarding
# Terminal 5: Monitoring + analytics
# Terminal 6: Documentation
```
