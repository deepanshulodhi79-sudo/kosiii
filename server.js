require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ================= GLOBAL STATE =================
// Per-sender hourly mail limit
let mailLimits = {};

// ================= MIDDLEWARE =================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================= ROUTES =================

// Root route - Ab direct launcher.html khulega (No Login)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

// Backward compatibility (agar purana path hit ho)
app.get('/launcher', (req, res) => {
  res.redirect('/');
});

// ================= HELPERS =================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Speed Control: 3 mails at a time with 1 sec delay for inbox deliverability
async function sendBatch(transporter, mails, batchSize = 3) {
  let results = [];
  for (let i = 0; i < mails.length; i += batchSize) {
    const chunk = mails.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      chunk.map(m => transporter.sendMail(m))
    );
    results.push(...batchResults);
    await delay(1000); // 1 sec delay batch ke beech
  }
  return results;
}

// ================= SEND MAIL =================

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({
        success: false,
        message: "❌ Email, App Password aur recipients zaruri hain!"
      });
    }

    const now = Date.now();

    // ⏱️ Hourly sender limit reset
    if (!mailLimits[email] || now - mailLimits[email].startTime > 60 * 60 * 1000) {
      mailLimits[email] = { count: 0, startTime: now };
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      return res.json({
        success: false,
        message: "❌ Valid recipients ki list daalein."
      });
    }

    if (mailLimits[email].count + recipientList.length > 27) {
      return res.json({
        success: false,
        message: `❌ Max limit 27 mails/hour hai. Baaki bacha limit: ${27 - mailLimits[email].count}`
      });
    }

    // 📧 Gmail SMTP Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password // Must be a 16-character App Password
      }
    });

    // Verify SMTP connection before attempting send
    try {
      await transporter.verify();
    } catch (verifyErr) {
      return res.json({
        success: false,
        message: `❌ Gmail Login Failed: ${verifyErr.message}. Make sure 2FA is ON and you are using a Gmail App Password!`
      });
    }

    // Inbox Friendly Email Format
    const mails = recipientList.map(r => {
      const textContent = message || "";
      return {
        from: `"${senderName || 'Sender'}" <${email}>`,
        to: r,
        subject: subject || "Quick Note",
        text: textContent,
        // Added HTML version so mail servers don't mark it as spam text
        html: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.6;">
                ${textContent.replace(/\n/g, '<br>')}
               </div>`,
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'Nodemailer'
        }
      };
    });

    // Send Mails in Controlled Batches
    const results = await sendBatch(transporter, mails, 3);

    const successfulCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    mailLimits[email].count += successfulCount;

    if (successfulCount === 0) {
      const firstError = results.find(r => r.status === 'rejected')?.reason?.message || "Unknown error";
      return res.json({
        success: false,
        message: `❌ Failed to send mails. Reason: ${firstError}`
      });
    }

    return res.json({
      success: true,
      message: `✅ ${successfulCount} mail(s) inbox me bhej diye gaye! (Failed: ${failedCount}) | Limit: ${mailLimits[email].count}/27`
    });

  } catch (err) {
    return res.json({ success: false, message: `Server error: ${err.message}` });
  }
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 Mail Launcher running on port ${PORT}`);
});
