# Anjana Welfares — Application Backend

A small Node.js server that receives the website's three application forms
(**Help Request**, **Volunteer**, **Partner**) and emails each submission to your
inbox — formatted with the Anjana Welfares logo, a short description of the form,
and the details in clean text.

It also serves the website itself (from `public/index.html`), so you can deploy
the whole thing as one app.

---

## What you need
- Node.js 18 or newer
- The Gmail account that will **send** the mail (e.g. `nawinhq@gmail.com`)
- A Gmail **App Password** for that account (see below)

## 1. Create a Gmail App Password (one time)
1. The sending Gmail account must have **2-Step Verification ON**
   (Google Account → Security → 2-Step Verification).
2. Then go to **Google Account → Security → App passwords**.
3. Create one (any name, e.g. "Anjana site"). Google shows a **16-character** password.
4. Copy it — you'll paste it as `MAIL_PASS` (remove any spaces).

## 2. Configure
```bash
cp .env.example .env
```
Open `.env` and set:
```
MAIL_USER=nawinhq@gmail.com          # the sending Gmail
MAIL_PASS=your16charapppassword      # the App Password from step 1
MAIL_TO=hello@anjanawelfares.com     # where submissions arrive
MAIL_FROM_NAME=Anjana Welfares Website
```

## 3. Run locally
```bash
npm install
npm start
```
Open **http://localhost:3000** — the site loads and the forms work.
Submit one; the email lands in `MAIL_TO`.

Health check: `http://localhost:3000/health`

---

## 4. Deploy (free options)

### Option A — Render.com (easiest)
1. Push this folder to a GitHub repo (the included `.gitignore` keeps secrets out).
2. On Render → **New → Web Service** → connect the repo.
3. Build command: `npm install`  ·  Start command: `npm start`.
4. Add the same variables from `.env` under **Environment**.
5. Deploy. Your site + API run at `https://your-app.onrender.com`.

### Option B — Railway.app
Similar: new project from repo, add the environment variables, deploy.

---

## 5. Where the website talks to the backend
Everything is wired already. In `public/index.html` there is one line near the
bottom `<script>`:
```js
var API_BASE = "";
```
- **Served by this backend** (recommended): leave it empty — same origin.
- **Website hosted elsewhere** (e.g. your own domain, and the backend on Render):
  set it to your backend URL, e.g.
  `var API_BASE = "https://your-app.onrender.com";`

---

## The received email
- Sent **from** `MAIL_USER`, **to** `MAIL_TO` (these live only on the server —
  they never appear on the website).
- Contains: the **Anjana Welfares logo**, a **short description** of which form
  was submitted, and the **details in text** (labelled fields).
- A plain-text version is included for every mail client.
- Open **`email-preview.html`** in a browser to see exactly how each of the three
  emails looks.

## Files
```
server.js            Express server + Nodemailer (Gmail SMTP)
email-template.js    Builds the text + branded HTML email
public/index.html    The Anjana Welfares website (forms wired to /api/apply)
assets/logo.png      Logo embedded in the email
email-preview.html   Preview of the received mail (all 3 forms)
.env.example         Copy to .env and fill in
```

## Notes
- Includes basic anti-spam: a per-IP rate limit (6/min) and a honeypot field.
- Never commit your real `.env` — it holds the App Password.
- Gmail sends ~500 emails/day on a free account, which is plenty here.
