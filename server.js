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

// Helper: Fast short delay
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

    // Single Optimized Transporter with Pooling for High Speed
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      pool: true,          // Fast connection reuse
      maxConnections: 5,   // Simultaneous connections
      maxMessages: 100,
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    // Fast Send Logic with Fingerprint Variations
    const sendPromises = recipientList.map(async (toEmail, index) => {
      // Fast stagger delay (0.5s to 1.5s gap between threads) so overall time stays under 15-20s
      await shortDelay(index * 600);

      const uniqueToken = Math.random().toString(36).substring(2, 7);
      const textBody = (message || "Hello, please review the attached information.") + `\n\n[Ref ID: ${uniqueToken}]`;

      const mailOptions = {
        from: `"${senderName || 'Sender'}" <${cleanEmail}>`,
        to: toEmail,
        subject: subject || "Important Update",
        text: textBody,
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'Apple Mail (2.3654.120)', // Simulates Apple Mail Client for better inbox placement
          'Message-ID': `<${Date.now()}-${uniqueToken}@gmail.com>`
        }
      };

      return transporter.sendMail(mailOptions);
    });

    // Process all mails concurrently within 15-20 seconds window
    const results = await Promise.allSettled(sendPromises);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    // Close transport pool
    transporter.close();

    return res.json({
      success: true,
      message: `⚡ Done in ~15-20s! Delivered: ${successCount} | Failed: ${failedCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Server Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Fast Mailer running on http://localhost:${PORT}`);
});
