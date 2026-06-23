# CircleChess Hiring Dashboard — Weekly Slots

A live dashboard that shows your weekly coach availability grid: which
coach is in which slot, and which slots have **no coach at all**.

It calls the same CircleChess APIs as your original script
(`coach-search`, `coach-weekly-slots`) — nothing about your backend
needs to change.

---

## What's in this folder

| File | What it does |
|---|---|
| `index.html` | The page structure (sidebar, header, grid, stat cards) |
| `style.css` | All the visual styling |
| `app.js` | Talks to the CircleChess API and draws the weekly grid |
| `config.js` | Your API URL and key — edit this if they ever change |
| `vercel.json` | Tells Vercel this is a simple static site |

---

## STEP 1 — Open this folder in VS Code

1. Open **VS Code**.
2. Go to **File → Open Folder…**
3. Select this `circlechess-dashboard` folder.
4. You should see all 5 files listed above in the left sidebar (Explorer).

---

## STEP 2 — Test it on your computer first (optional but recommended)

1. In VS Code, install the **"Live Server"** extension:
   - Click the Extensions icon on the left (looks like 4 squares).
   - Search "Live Server" (by Ritwick Dey).
   - Click **Install**.
2. Right-click `index.html` in the file list → **"Open with Live Server"**.
3. Your browser should open the dashboard automatically. Confirm the
   weekly grid loads real data before moving on.

### If you hit CORS errors while developing

If your browser shows a CORS error like "No 'Access-Control-Allow-Origin' header is present", run the local proxy and update the page to use it automatically when served from `localhost`:

1. Install dependencies and run the proxy:

```bash
npm install express node-fetch
node proxy-server.js
```

2. Open the site using Live Server at `http://127.0.0.1:3000` (default) and the app will route API calls through the proxy at `http://127.0.0.1:3001`.

The proxy forwards the two endpoints used by the app and sets `Access-Control-Allow-Origin: *` for development only.

---

## STEP 3 — Push this to GitHub

1. Open a new terminal in VS Code: **Terminal → New Terminal**.
2. Run these commands one at a time (press Enter after each):

```bash
git init
git add .
git commit -m "Initial CircleChess Hiring Dashboard"
```

3. Go to **github.com** → click the **+** icon (top right) → **New repository**.
   - Name it something like `circlechess-hiring-dashboard`.
   - Keep it **Private** (recommended, since it has an API key in it).
   - Do **NOT** check "Add a README" — you already have files locally.
   - Click **Create repository**.
4. GitHub will show you a page with commands under "…or push an
   existing repository from the command line". Copy those two lines —
   they'll look like this (your URL will be different):

```bash
git remote add origin https://github.com/YOUR-USERNAME/circlechess-hiring-dashboard.git
git branch -M main
git push -u origin main
```

5. Paste them into the VS Code terminal and press Enter. If asked,
   sign in to GitHub in the browser window that pops up.
6. Refresh your GitHub repository page — you should now see all 5 files there.

---

## STEP 4 — Deploy to Vercel

1. Go to **vercel.com** and sign in (you can use your GitHub account
   to sign in — click "Continue with GitHub").
2. Click **"Add New…" → "Project"**.
3. Find `circlechess-hiring-dashboard` in the list and click **Import**.
4. Vercel will auto-detect it as a static site — you don't need to
   change any settings (Framework Preset: "Other" is fine).
5. Click **Deploy**.
6. After ~30 seconds, Vercel will give you a live link like
   `circlechess-hiring-dashboard.vercel.app` — that's your dashboard,
   live on the internet.

---

## Making changes later

Whenever you want to update the dashboard (e.g. change colors, add
the Coaches page, etc.):

1. Edit the files in VS Code.
2. In the terminal, run:
   ```bash
   git add .
   git commit -m "describe what you changed"
   git push
   ```
3. Vercel automatically redeploys within a minute — no extra steps needed.

---

## Important note on the API key

`config.js` contains your `NOCOBASE_API_KEY` in plain text. Right now
this is fine because:
- The GitHub repo is private.
- The link is only shared internally.

**But** once the site is live on Vercel, anyone who has the dashboard
link can open their browser's dev tools (F12) and see this key in the
page source. If you ever make this dashboard public, or want to lock
it down further, come back and ask to move the key into a secure
server-side function — that's a quick follow-up change.

---

## What's next

This first version only shows **Weekly Slots**, as requested. Once
you've reviewed how it looks and works, we can add:
- Coaches page
- Applications
- Interviews
- Reports
- A simple password screen for extra privacy

Just let me know which one to build next.
