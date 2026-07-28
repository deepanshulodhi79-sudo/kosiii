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

// Delay helper (Gmail spam filter bypass)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ 
        success: false, 
        message: "❌ Email, App Password aur Recipients zaroori hain!" 
      });
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

    // Sequential Sending with Isolated Transporter Connections
    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];
      const textContent = message || "Hello, please check the update.";

      // 1. Every email gets a FRESH isolated transporter connection
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: cleanEmail,
          pass: cleanPassword
        },
        // Direct socket connection without pooling
        pool: false
      });

      const mailOptions = {
        from: `"${cleanSenderName}" <${cleanEmail}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        text: textContent,
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 14px; color: #222222; line-height: 1.5;">
            ${textContent.replace(/\n/g, '<br>')}
          </div>
        `,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal'
        }
      };

      try {
        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`[${i + 1}/${recipientList.length}] Sent to ${toEmail}`);
      } catch (err) {
        console.error(`Failed to send to ${toEmail}:`, err.message);
        failedCount++;
      } finally {
        transporter.close(); // Close socket connection immediately
      }

      // 2. Anti-spam Stagger Delay: 3.5 seconds gap between emails
      if (i < recipientList.length - 1) {
        await delay(3500);
      }
    }

    return res.json({
      success: true,
      message: `✅ Done! Sent: ${successCount} | Failed: ${failedCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Server Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer running on http://localhost:${PORT}`);
});
