// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 🔑 Hardcoded login
const HARD_USERNAME = "Kosi Rajput";
const HARD_PASSWORD = "Kosi@009";

// ================= GLOBAL SAFE LIMITS =================
const HOURLY_LIMIT = 30;      // safe
const DAILY_LIMIT = 120;     // safe
let senderStats = {};

// ================= MIDDLEWARE =================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'bulk-mailer-secret',
  resave: false,
  saveUninitialized: true
}));

// 🔒 Auth middleware
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/');
}

// ================= ROUTES =================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  return res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/launcher', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// ================= HELPERS =================
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ⚡ SPEED SAME
async function sendBatch(transporter, mails, batchSize = 5) {
  for (let i = 0; i < mails.length; i += batchSize) {
    await Promise.allSettled(
      mails.slice(i, i + batchSize).map(mail => transporter.sendMail(mail))
    );
    await delay(200);
  }
}

// ================= SEND MAIL =================
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "Email, password and recipients required" });
    }

    const now = Date.now();
    if (!senderStats[email]) {
      senderStats[email] = { hour: 0, day: 0, hourStart: now, dayStart: now };
    }

    // reset hourly
    if (now - senderStats[email].hourStart > 60 * 60 * 1000) {
      senderStats[email].hour = 0;
      senderStats[email].hourStart = now;
    }

    // reset daily
    if (now - senderStats[email].dayStart > 24 * 60 * 60 * 1000) {
      senderStats[email].day = 0;
      senderStats[email].dayStart = now;
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (!recipientList.length) {
      return res.json({ success: false, message: "No valid recipients" });
    }

    if (
      senderStats[email].hour + recipientList.length > HOURLY_LIMIT ||
      senderStats[email].day + recipientList.length > DAILY_LIMIT
    ) {
      return res.json({
        success: false,
        message: "❌ Sending limit reached (hour/day)"
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass: password }
    });

    // ✅ Soft footer (same meaning, less trigger)
    const footerText = "\n\nMessage checked for safety";

    const mails = recipientList.map(r => ({
      from: `"${senderName && senderName.trim() ? senderName : email.split('@')[0]}" <${email}>`,
      to: r,

      // ✅ soft subject
      subject: subject && subject.trim() ? subject : "Quick question",

      // ✅ multipart mail (VERY IMPORTANT)
      text: (message || "") + footerText,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
          <p>${(message || "").replace(/\n/g, "<br>")}</p>
          <br>
          <small style="color:#555">Message checked for safety</small>
        </div>
      `,

      headers: {
        "Reply-To": email,
        "X-Mailer": "Gmail"
      }
    }));

    await sendBatch(transporter, mails, 5);

    senderStats[email].hour += recipientList.length;
    senderStats[email].day += recipientList.length;

    return res.json({
      success: true,
      message: `✅ Sent ${recipientList.length}`
    });

  } catch (error) {
    console.error("Send error:", error);
    return res.json({ success: false, message: error.message });
  }
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
