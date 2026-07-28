require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

let mailLimits = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mails ko slow rate par bhejna spam filters ko bypass karta hai
async function sendBatch(transporter, mails) {
  let results = [];
  for (let i = 0; i < mails.length; i++) {
    try {
      const info = await transporter.sendMail(mails[i]);
      results.push({ status: 'fulfilled', value: info });
    } catch (err) {
      results.push({ status: 'rejected', reason: err });
    }
    // Har mail ke beech 2 second ka gap (Anti-Spam Delay)
    if (i < mails.length - 1) await delay(2000);
  }
  return results;
}

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
    if (!mailLimits[email] || now - mailLimits[email].startTime > 60 * 60 * 1000) {
      mailLimits[email] = { count: 0, startTime: now };
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      return res.json({ success: false, message: "❌ Valid recipient emails dalein." });
    }

    if (mailLimits[email].count + recipientList.length > 27) {
      return res.json({
        success: false,
        message: `❌ Per hour limit 27 hai. Remaining limit: ${27 - mailLimits[email].count}`
      });
    }

    // Direct Gmail SMTP Transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: email,
        pass: password.replace(/\s+/g, '') // App password ke spaces hata do
      }
    });

    const cleanSenderName = senderName ? senderName.replace(/"/g, '') : 'Support';
    
    // Anti-Spam Message Formatting
    const mails = recipientList.map((r, index) => {
      const textBody = message || "Hello, please find the update requested.";
      const uniqueId = Date.now() + "_" + index;

      return {
        from: `"${cleanSenderName}" <${email}>`,
        to: r,
        subject: subject || "Important Update",
        text: textBody,
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333; line-height: 1.6;">
            <p>${textBody.replace(/\n/g, '<br>')}</p>
          </div>
        `,
        headers: {
          'X-Mailer': 'Microsoft Outlook 16.0',
          'X-Priority': '3 (Normal)',
          'Message-ID': `<${uniqueId}@gmail.com>`
        }
      };
    });

    const results = await sendBatch(transporter, mails);

    const successfulCount = results.filter(r => r.status === 'fulfilled').length;
    mailLimits[email].count += successfulCount;

    return res.json({
      success: true,
      message: `✅ Mails sent successfully: ${successfulCount}/${recipientList.length}`
    });

  } catch (err) {
    return res.json({ success: false, message: `Server error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mail Launcher active on port ${PORT}`);
});
