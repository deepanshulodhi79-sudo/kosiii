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

// Random delay between min and max seconds (Smart Human Behavior)
function getRandomDelay(minSec = 4, maxSec = 7) {
  const ms = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "❌ Sabhi fields bharna zaroori hai!" });
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      return res.json({ success: false, message: "❌ Recipient email list khali hai." });
    }

    const cleanEmail = email.trim();
    const cleanPassword = password.replace(/\s+/g, '');
    const cleanSenderName = senderName ? senderName.trim() : 'Sender';

    let successCount = 0;
    let failedCount = 0;

    // Single Auth Transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];
      const textContent = message || "Hello, please check the details.";

      // Dynamic unique ID ONLY in background headers (Mail body clean rahegi)
      const threadId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const mailOptions = {
        from: `"${cleanSenderName}" <${cleanEmail}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        text: textContent,
        html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #111;">${textContent.replace(/\n/g, '<br>')}</div>`,
        headers: {
          'X-Entity-Ref-ID': threadId,
          'Message-ID': `<msg-${threadId}@gmail.com>`
        }
      };

      try {
        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`[${i + 1}/${recipientList.length}] Sent to ${toEmail}`);
      } catch (err) {
        console.error(`Failed for ${toEmail}:`, err.message);
        failedCount++;
      }

      // Agli mail bhejne se pehle 4 se 7 second ka gap
      if (i < recipientList.length - 1) {
        await getRandomDelay(4, 7);
      }
    }

    return res.json({
      success: true,
      message: `✅ Mails processed! Sent: ${successCount} | Failed: ${failedCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Server Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server active on http://localhost:${PORT}`);
});
