// Anjana Welfares — application backend
// Receives form submissions from the website and emails them to the inbox.
//
// IMPORTANT: This version sends mail through Resend's HTTPS API instead of
// Gmail SMTP. Railway blocks outbound SMTP (ports 25/465/587) on Free, Trial
// and Hobby plans, which made the old smtp.gmail.com code hang forever and
// left the form stuck on "Sending...". An HTTPS API works on every plan.

const path = require('path');
const fs = require('fs');

// Load .env explicitly from this file's own folder.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { buildEmail, ORDER } = require('./email-template');

const app = express();
app.use(cors());
app.use(express.json({ limit: '512kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const {
  RESEND_API_KEY,                          // from https://resend.com/api-keys
  MAIL_TO,                                 // destination inbox(es); comma-separated is allowed
  // The "from" address MUST be on a domain you've verified in Resend, e.g.
  // 'website@anjanawelfares.org'. For quick testing without a verified domain,
  // Resend lets you send from 'onboarding@resend.dev' (but only to your own
  // Resend account email). Verify your domain for production use.
  MAIL_FROM = 'onboarding@resend.dev',
  MAIL_FROM_NAME = 'Anjana Welfares Website',
  PORT = 3000
} = process.env;

// MAIL_TO may contain several comma-separated addresses. Resend expects an
// ARRAY of individual addresses, so split/trim into a clean list here.
// (The old `to: [MAIL_TO]` sent "a@x.com,b@y.com" as ONE invalid recipient,
//  which Resend rejected -> the /api/apply 500 you were seeing.)
const MAIL_TO_LIST = (MAIL_TO || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ---- Startup validation ----
// .env is gitignored, so on Railway these must be set in the service's
// Variables tab. We log loudly but keep the site + static frontend running;
// only /api/apply fails (with a clear message) until they're set.
const missing = [];
if (!RESEND_API_KEY || !RESEND_API_KEY.trim()) missing.push('RESEND_API_KEY');
if (!MAIL_TO_LIST.length) missing.push('MAIL_TO');

if (missing.length) {
  console.error('----------------------------------------------------');
  console.error('WARNING: missing required environment variable(s):');
  missing.forEach(k => console.error('  - ' + k));
  console.error('');
  console.error('Set them in Railway: Service -> Variables tab.');
  console.error('  RESEND_API_KEY = your key from https://resend.com/api-keys');
  console.error('  MAIL_TO        = the inbox that should receive submissions');
  console.error('  MAIL_FROM      = a verified-domain sender (or onboarding@resend.dev to test)');
  console.error('');
  console.error('The site will still start, but /api/apply returns a clear');
  console.error('"email service not configured" error until this is fixed.');
  console.error('----------------------------------------------------');
} else {
  console.log('Resend email configured — ready to send mail.');
  console.log('  from: ' + MAIL_FROM);
  console.log('  to:   ' + MAIL_TO_LIST.join(', '));
}

// Load the inline logo once at startup (used as an inline attachment via cid).
let logoBase64 = null;
try {
  logoBase64 = fs.readFileSync(path.join(__dirname, 'assets', 'logo.png')).toString('base64');
} catch (e) {
  console.warn('Could not read assets/logo.png — emails will send without the inline logo.');
}

// simple in-memory rate limit (per IP) to deter abuse
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 6; // max 6 submissions / minute / IP
}

const ALLOWED = ['Help Request', 'Volunteer', 'Partner'];

// Send via Resend's HTTPS API, with a hard timeout so a request can never hang.
async function sendViaResend({ subject, text, html, replyTo }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000); // 15s ceiling

  const payload = {
    from: '"' + MAIL_FROM_NAME + '" <' + MAIL_FROM + '>',
    to: MAIL_TO_LIST,                        // <-- array of clean addresses
    subject,
    text,
    html
  };
  if (replyTo) payload.reply_to = replyTo;
  if (logoBase64) {
    payload.attachments = [{
      filename: 'logo.png',
      content: logoBase64,
      content_id: 'anjanalogo' // matches <img src="cid:anjanalogo"> in the template
    }];
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = body && body.message ? body.message : ('HTTP ' + res.status);
      throw new Error('Resend rejected the email: ' + reason);
    }
    return body; // contains the sent message id
  } finally {
    clearTimeout(timer);
  }
}

app.post('/api/apply', async (req, res) => {
  try {
    if (missing.length) {
      return res.status(503).json({
        ok: false,
        error: 'Email service is not configured on the server (missing RESEND_API_KEY/MAIL_TO). Please contact the site admin.'
      });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip';
    if (limited(ip)) return res.status(429).json({ ok: false, error: 'Too many requests. Please wait a moment.' });

    const { formType, data } = req.body || {};
    if (!formType || !ALLOWED.includes(formType) || !data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'Invalid submission.' });
    }

    // basic required-field check
    const required = (ORDER[formType] || []).filter(k => k !== 'details');
    for (const k of required) {
      if (!data[k] || String(data[k]).trim() === '') {
        return res.status(400).json({ ok: false, error: 'Missing field: ' + k });
      }
    }
    // honeypot (optional field the UI leaves empty; bots fill it)
    if (data._gotcha) return res.json({ ok: true });

    const { subject, text, html } = buildEmail(formType, data);
    await sendViaResend({ subject, text, html, replyTo: data.email || undefined });

    res.json({ ok: true });
  } catch (err) {
    const msg = err && err.name === 'AbortError'
      ? 'The email service timed out. Please try again in a moment.'
      : (err && err.message) || 'Could not send. Please try again.';
    console.error('send error:', msg);
    // Surface the real reason to the client too. This makes debugging far
    // easier while you're getting Resend set up. Once it's working reliably
    // you can swap `error: msg` back to a generic message if you prefer.
    res.status(500).json({ ok: false, error: msg });
  }
});

app.get('/health', (_req, res) => res.json({
  ok: true,
  service: 'anjana-backend',
  mailConfigured: missing.length === 0,
  missingEnvVars: missing
}));
app.get('/api', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log('Anjana backend listening on port ' + PORT));
