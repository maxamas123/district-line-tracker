# District Line Tracker — Wimbledon Branch

A community tool for reporting and tracking delays on the District Line Wimbledon branch (Wimbledon to Earls Court). Built to document the scale of service problems and present evidence to TfL and local MPs.

## How it works

- Commuters submit reports via a mobile-friendly form
- Each report captures the **live TfL status** at that moment — documenting when TfL says "Good Service" while you're standing on a packed platform waiting 20 minutes
- Reports are stored in Supabase (shared database)
- A cron job logs the TfL status every hour for historical comparison
- The feed shows all reports with filters
- (Coming soon) Dashboard with charts, trends, and AI analysis

## Tech stack

| Layer    | Tool     | Why                                        |
|----------|----------|--------------------------------------------|
| Frontend | HTML/CSS/JS | Vanilla — no frameworks, no build step   |
| Database | Supabase | Free Postgres with REST API, no backend needed |
| Hosting  | Netlify  | Free tier, deploys from GitHub             |
| Cron     | Netlify Functions | Hourly TfL status logging          |
| Code     | GitHub   | Version control + Netlify auto-deploy      |

---

## Setup guide

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick any region, note down the password)
3. Once created, go to **SQL Editor** in the left sidebar
4. Paste the contents of `supabase-setup.sql` and click **Run**
5. Go to **Settings > API** and note down:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`)
   - **anon public key** (the long string under "Project API keys")
   - **service_role key** (used for the cron job only — keep this secret)

### 2. Add your Supabase details to the app

Open `js/app.js` and replace the two placeholder values near the top:

```js
var SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
var SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/district-line-tracker.git
git push -u origin main
```

### 4. Deploy on Netlify

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub
2. Click **Add new site > Import an existing project**
3. Select your `district-line-tracker` repo
4. Netlify will auto-detect the config from `netlify.toml`
5. Before deploying, add **environment variables** under Site > Environment variables:
   - `SUPABASE_URL` — your project URL
   - `SUPABASE_SERVICE_KEY` — the service_role key (for the cron function)
6. Click **Deploy**

Your site will be live at `https://your-site-name.netlify.app`.

### 5. Share with your WhatsApp group

Share the Netlify URL in your WhatsApp groups. The form is mobile-friendly — people can report issues straight from the platform.

---

## Project structure

```
district-line-tracker/
├── index.html              # Report submission form
├── feed.html               # Live feed of reports
├── dashboard.html          # Dashboard (Slice 3 — coming soon)
├── css/
│   └── style.css           # All styles
├── js/
│   ├── app.js              # Supabase + TfL API integration
│   └── feed.js             # Feed page logic
├── netlify/
│   └── functions/
│       └── tfl-cron.mjs    # Hourly TfL status logger
├── netlify.toml            # Netlify config
├── supabase-setup.sql      # Database setup script
└── README.md
```

## Building in slices

This project follows a sliced delivery approach:

- **Slice 1** (done): Report submission form → Supabase, with TfL status capture
- **Slice 2** (done): Feed view with filtering
- **Slice 3** (planned): Dashboard with charts, station heatmap, trend analysis
- **Slice 4** (planned): AI summary generation for sharing with MP

## TfL API integration

The app uses the free TfL Unified API:

- **On report submit**: fetches live District line status and stores it alongside the report
- **Hourly cron**: logs the status every hour to `tfl_status_log` for historical tracking
- **Discrepancy detection**: flags when TfL says "Good Service" but users report delays

TfL severity codes: 10 = Good Service, 9 = Minor Delays, 6 = Severe Delays, 2 = Suspended.
