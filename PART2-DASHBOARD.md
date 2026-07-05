# Part 2: Dashboard & Local API — Deployment Guide

## Overview

Three pieces need to be set up:

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   Vercel (Astro)     │────>│  Supabase (status)   │<────│  Your Phone (API)    │
│  mc-dashboard.vercel │     │  - server_status     │     │  localhost:3000       │
│  .app                │     │  - Auth              │     │  (via tunnel)        │
│                      │────>│                      │     │                      │
│  Login → Dashboard   │ 1.  │  1. Read status      │     │  POST /start         │
│  Start/Stop/Restart  │ 2.  │  2. Write tunnel_url │     │  POST /stop          │
│  Settings (tunnel)   │     │  3. Realtime push    │     │  GET /status         │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

- **Dashboard** (Vercel): reads status from Supabase, sends commands to the phone via tunnel
- **Supabase**: stores `server_status` row, handles auth, optionally pushes live updates
- **Local API** (phone): lives next to PocketMine-MP, exposes HTTP endpoints with token auth

---

## Step 1: Supabase Setup

### 1a. Create a Supabase project (if you haven't already)

1. Go to https://supabase.com and log in
2. Create a new project (free tier). Note the **Project URL** and **anon public key** (in Settings → API)

### 1b. Run the schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open `/supabase/schema.sql` from this repo
3. Paste and run it — this creates the `server_status` table, sets up RLS policies, and inserts the first row

### 1c. Enable Auth (email/password)

1. Go to **Authentication → Providers**
2. Make sure **Email** is enabled
3. Under **Settings → Auth**, you can keep the defaults (email confirmations are up to you — disable for testing, enable for production)

### 1d. Enable Realtime (optional, for live dashboard updates)

1. Go to **Database → Replication**
2. Under the `supabase_realtime` publication, add the `server_status` table
3. Now the dashboard will update automatically when the local API pushes status

---

## Step 2: Deploy Dashboard to Vercel

### 2a. Create a Vercel account and install CLI (or connect GitHub)

### 2b. Deploy the `dashboard/` folder

**Option A — via Vercel CLI (quickest):**

```bash
cd dashboard
npm i -g vercel
vercel --prod
```

**Option B — via GitHub:**

1. Push this whole repo to a GitHub repo
2. Go to https://vercel.com → Add New Project → Import your repo
3. Set the **Root Directory** to `dashboard`
4. Add these environment variables in Vercel:

| Key | Value |
|-----|-------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxxx.supabase.co`) |
| `PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |

5. Deploy

### 2c. Set up a custom domain (optional)

Vercel gives you `your-project.vercel.app` for free. You can add a custom domain later.

---

## Step 3: Set Up the Local API on Your Phone

### 3a. Pre-requisites

You already have:
- Termux installed on your phone
- PHP + PocketMine-MP running in `~/mcserver/`
- Node.js installed in Termux (`pkg install nodejs -y`)

### 3b. Copy the local-api folder to your phone

The simplest way: use `scp`, `rsync`, or just copy via USB/cloud. Or recreate the structure manually on the phone:

```bash
cd ~
mkdir -p local-api
```

Copy these files from the repo's `local-api/` folder to `~/local-api/` on your phone:
- `package.json`
- `server.js`
- `.env.example` → rename to `.env`

### 3c. Install dependencies

```bash
cd ~/local-api
npm install
```

### 3d. Configure environment

Edit `~/local-api/.env`:

```bash
nano ~/local-api/.env
```

Fill in:

```
PORT=3000
API_AUTH_TOKEN=<generate a random string — this is your dashboard's password>
MINECRAFT_PHAR_PATH=../mcserver/PocketMine-MP.phar
MINECRAFT_WORK_DIR=../mcserver
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PUSH_INTERVAL_SECONDS=15
```

### 3e. Run the API alongside your Minecraft server

```bash
cd ~/local-api
screen -S api node server.js
```

Detach: `Ctrl+A, D`

You should see:
```
MC Bedrock Local API running on port 3000
Supabase push enabled
```

---

## Step 4: Expose the Local API via Tunnel

The local API runs on `http://localhost:3000` but needs to be reachable from the internet. Since you're already using **Playit.gg** for the Minecraft server, you need a _second tunnel_ for the HTTP API.

### Option A: Playit.gg (simplest, one more command)

```bash
playit
# In the Playit dashboard, add a new TCP tunnel
#   Local address: 127.0.0.1:3000
# This gives you a URL like: https://something.playit.gg
```

### Option B: ngrok

```bash
pkg install ngrok -y
screen -S ngrok ngrok http 3000
```

ngrok gives you a URL like `https://abc123.ngrok-free.app`. **Copy this URL.**

### Option C: localhost.run (SSH-based, no install)

```bash
ssh -R 80:localhost:3000 nokey@localhost.run
```

You get a URL like `https://abc-123-456-789.loca.lt`.

---

## Step 5: Connect Everything

### 5a. Log into the dashboard

1. Open your Vercel URL (`https://your-project.vercel.app`)
2. Click **Sign Up** and create an account with your email + password
3. Check your email for the confirmation link (or disable email confirmation in Supabase Auth settings)

### 5b. Configure tunnel URL in Settings

1. In the dashboard, go to **Settings**
2. Set **Tunnel URL** to your ngrok/Playit URL (e.g. `https://abc123.ngrok-free.app`)
3. Set **API Auth Token** to the `API_AUTH_TOKEN` you put in the `.env` file
4. Set **Host Device Label** to `Android (Termux)`
5. Click **Save**

### 5c. Test

1. Go back to the **Dashboard**
2. You should see the server status (it will take up to 15 seconds for the first push)
3. Click **Start** to start the Minecraft server
4. Click **Stop** to stop it
5. Recent logs should appear in the log viewer

---

## Moving to a Different Device Later

1. **Copy the local-api folder** to the new device (along with `mcserver/`)
2. **Install Node.js** on the new device + npm install
3. **Update `.env`** — the `API_AUTH_TOKEN` stays the same, `SUPABASE_URL`/`SUPABASE_ANON_KEY` stay the same
4. **Update the tunnel** — run a tunnel on the new device
5. **Update the tunnel URL in the dashboard Settings** — that's it, no redeploy needed

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Dashboard says "Supabase not configured" | `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` not set in Vercel |
| Login fails | Auth not enabled in Supabase; check email confirmation setting |
| "Could not reach the host device" | Tunnel URL is wrong, or the local API isn't running |
| "Unauthorized" in API logs | `API_AUTH_TOKEN` in phone's `.env` doesn't match what's in Settings |
| No status update after 15s | Local API can't reach Supabase (check internet on phone, check SUPABASE_URL/KEY in .env) |
| Server won't start | PHP not in PATH, or `PocketMine-MP.phar` not found at the configured path |
