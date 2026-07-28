require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

function shortDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "❌ Email, App Password aur Recipients zaroori hain!" });
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      return res.json({ success: false, message: "❌ Valid recipients ki list daalein." });
    }

    const cleanEmail = email.trim();
    const cleanPassword = password.replace(/\s+/g, '');

    // Fast Transporter Setup
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 5,
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    // Fast Send Process
    const sendPromises = recipientList.map(async (toEmail, index) => {
      // Short stagger delay (~0.5s per email)
      await shortDelay(index * 500);

      // Unique identifier background headers ke liye
      const hiddenToken = Math.random().toString(36).substring(2, 9);

      const mailOptions = {
        from: `"${senderName || 'Sender'}" <${cleanEmail}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        
        // ✉️ PURE & CLEAN MESSAGE (Koyi extra text/Ref ID nahi aayega)
        text: message || "",
        
        // Anti-spam identifier hidden headers me bhej rahe hain
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'Apple Mail (2.3654.120)',
          'Message-ID': `<msg-${Date.now()}-${hiddenToken}@gmail.com>`
        }
      };

      return transporter.sendMail(mailOptions);
    });

    const results = await Promise.allSettled(sendPromises);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    transporter.close();

    return res.json({
      success: true,
      message: `⚡ Done! Sent: ${successCount} | Failed: ${failedCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Server Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Fast Mailer running on http://localhost:${PORT}`);
});
