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

// Fast Delay (1.5s - 2.5s) to complete entire batch in ~10-15 seconds
function getFastDelay() {
  const ms = Math.floor(Math.random() * 1000) + 1500; // 1.5 to 2.5 secs
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
      const textContent = message || "Hello, please find the update below.";
      
      // Dynamic internal ID (Hidden in headers)
      const uniqueMsgId = `${Date.now()}.${Math.floor(Math.random() * 100000)}@gmail.com`;

      const mailOptions = {
        from: `"${cleanSenderName}" <${cleanEmail}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        text: textContent,
        html: `<p style="font-family: Arial, sans-serif; font-size: 14px; color: #222222; margin: 0;">${textContent.replace(/\n/g, '<br>')}</p>`,
        headers: {
          'Message-ID': `<${uniqueMsgId}>`,
          'X-Priority': '3',
          'X-Mailer': 'GmailApp'
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

      // Fast Delay (Only 1.5 - 2.5 seconds gap)
      if (i < recipientList.length - 1) {
        await getFastDelay();
      }
    }

    return res.json({
      success: true,
      message: `⚡ Fast process done! Sent: ${successCount} | Failed: ${failedCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Server Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Fast Mailer active on http://localhost:${PORT}`);
});
