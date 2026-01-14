// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 🔑 Hardcoded login (Updated)
const HARD_USERNAME = "Kosi Rajput";
const HARD_PASSWORD = "Kosi@009";

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

// ⚡ speed SAME
async function sendBatch(transporter, mails, batchSize = 5) {
  const results = [];
  for (let i = 0; i < mails.length; i += batchSize) {
    const batch = mails.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(mail => transporter.sendMail(mail))
    );
    results.push(...settled);
    await delay(200);
  }
  return results;
}

// ================= SEND MAIL =================
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({
        success: false,
        message: "Email, password and recipients required"
      });
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (!recipientList.length) {
      return res.json({ success: false, message: "No valid recipients" });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: email,
        pass: password
      }
    });

    // ✅ FOOTER KEPT (as requested)
    const footer = "\n\nScanned & Secured";

    const mails = recipientList.map(r => ({
      from: `"${senderName && senderName.trim() ? senderName : email.split('@')[0]}" <${email}>`,
      to: r,
      subject: subject && subject.trim() ? subject : "Hello",
      text: (message || "") + footer,
      headers: {
        "Reply-To": email,
        "X-Mailer": "Gmail"
      }
    }));

    await sendBatch(transporter, mails, 5);

    return res.json({
      success: true,
      message: `✅ Mail sent to ${recipientList.length}`
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
