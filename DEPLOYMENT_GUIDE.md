# Deployment Guide — AI Desktop Assistant SaaS

Deploy your app so it's accessible from anywhere via a custom subdomain.
**Stack:** Supabase (PostgreSQL) → Render.com (hosting) → cPanel (custom domain DNS)

---

## Step 1 — Push to GitHub

1. Create a new GitHub repo (e.g., `ai-assistant`)
2. From your project directory run:

```bash
cd G:\Ai-assitent\ai-assistant
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ai-assistant.git
git push -u origin main
```

> The `.gitignore` already excludes `venv/`, `.env`, `*.db`, `node_modules/`, `.next/`, `dist/`

---

## Step 2 — Create Supabase PostgreSQL Database

1. Go to **https://supabase.com** → Sign up / Log in
2. Click **New Project** → fill in:
   - Project name: `ai-assistant`
   - Database password: (save this — you'll need it)
   - Region: choose closest to you
3. Wait ~2 minutes for provisioning
4. Go to **Settings → Database → Connection string → URI**
5. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. Save this — you'll paste it into Render in Step 3

---

## Step 3 — Deploy on Render.com

### 3a. Create account & connect GitHub

1. Go to **https://render.com** → Sign up / Log in
2. Click **New → Blueprint** (this reads your `render.yaml`)
3. Connect your GitHub account → select your `ai-assistant` repository
4. Render will detect the `render.yaml` and show 2 services:
   - `ai-assistant-backend`
   - `ai-assistant-frontend`

### 3b. Set environment variables

Before clicking Deploy, set these manually in the Render dashboard:

**For `ai-assistant-backend`:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase connection string from Step 2 |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `CORS_ORIGINS` | `https://ai-assistant-frontend.onrender.com` (update after frontend deploys) |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASSWORD` | Your Gmail App Password |
| `EMAIL_FROM` | Your Gmail address |

**For `ai-assistant-frontend`:**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://ai-assistant-backend.onrender.com` |

### 3c. Deploy

1. Click **Apply** / **Deploy**
2. Wait 5–10 minutes for both services to build
3. Render gives you URLs like:
   - Backend: `https://ai-assistant-backend.onrender.com`
   - Frontend: `https://ai-assistant-frontend.onrender.com`
4. Test: open the frontend URL → should show the login page

### 3d. Seed the database (first time only)

After deploy, open Render → `ai-assistant-backend` → **Shell** tab:

```bash
python -c "
import sys
sys.path.insert(0, '.')
sys.path.insert(0, './database')
sys.path.insert(0, './backend')
sys.path.insert(0, './core')
from database.db import SessionLocal
from database import models
from database.db import engine
models.Base.metadata.create_all(bind=engine)
import bcrypt
db = SessionLocal()
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(b'admin123', salt).decode()
user = models.User(username='admin', email='admin@example.com', hashed_password=hashed, full_name='Admin', is_active=True)
db.add(user)
db.commit()
print('Admin user created: admin / admin123')
db.close()
"
```

---

## Step 4 — Set Up Custom Subdomain via cPanel

You want something like `app.yourdomain.com` to point to your Render frontend.

### 4a. Get the Render frontend URL

From Render dashboard, copy your frontend URL:
`https://ai-assistant-frontend.onrender.com`

### 4b. Add subdomain in cPanel

1. Log in to your **cPanel** (usually at `yourdomain.com/cpanel`)
2. Go to **Domains → Subdomains**
3. Create a subdomain:
   - Subdomain: `app`
   - Domain: `yourdomain.com`
   - Document Root: (auto-filled, leave as is)
4. Click **Create**

### 4c. Add CNAME record in DNS

1. In cPanel → go to **Zone Editor** (or **DNS Zone Editor**)
2. Find your domain → click **Manage**
3. Click **Add Record** → choose **CNAME**
4. Fill in:
   - **Name:** `app` (or `app.yourdomain.com.`)
   - **TTL:** `14400` (or leave default)
   - **Record:** `ai-assistant-frontend.onrender.com`
5. Click **Add Record**

> DNS propagation takes 5–30 minutes (sometimes up to 24 hours).

### 4d. Add custom domain to Render

1. In Render → `ai-assistant-frontend` → **Settings → Custom Domains**
2. Click **Add Custom Domain**
3. Enter: `app.yourdomain.com`
4. Render will verify the DNS and auto-provision an SSL certificate

### 4e. Update CORS on backend

1. In Render → `ai-assistant-backend` → **Environment**
2. Update `CORS_ORIGINS`:
   ```
   https://app.yourdomain.com,https://ai-assistant-frontend.onrender.com
   ```
3. Save → backend will redeploy automatically

---

## Step 5 — Verify Everything Works

1. Open `https://app.yourdomain.com` → login page loads
2. Login with `admin` / `admin123`
3. Dashboard loads with charts
4. CRM page shows leads
5. Test on mobile — hamburger menu should work

---

## Getting a Gemini API Key

1. Go to **https://aistudio.google.com/app/apikey**
2. Click **Create API Key**
3. Copy it → paste into Render's `GEMINI_API_KEY` env var

---

## Getting a Gmail App Password

Required for the Email feature:

1. Go to your Google Account → **Security**
2. Enable **2-Step Verification** (required)
3. Go to **Security → App passwords**
4. Select app: **Mail**, device: **Other** → name it "AI Assistant"
5. Copy the 16-character password → use as `SMTP_PASSWORD`

---

## Free Tier Notes

| Service | Free Plan |
|---|---|
| Render.com | 750 hours/month (enough for 1 always-on service); **spins down after 15 min idle** on free tier |
| Supabase | 500MB database, 2 projects |

> To keep your Render app always-on, upgrade to Render Starter ($7/month) or use a free uptime monitor like **UptimeRobot** to ping your backend every 14 minutes.

---

## Re-deploying After Code Changes

```bash
git add .
git commit -m "Your changes"
git push
```

Render auto-deploys on every push to `main`. No manual action needed.
