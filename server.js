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

// Fixed 3-second delay to balance speed and anti-spam limits
function delay(ms) {
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

    const cleanEmail = email.trim();
    const cleanPassword = password.replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    let successCount = 0;

    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];

      const mailOptions = {
        from: senderName ? `"${senderName}" <${cleanEmail}>` : cleanEmail,
        to: toEmail,
        subject: subject || "Important Information Notice",
        text: message || "Hello, please review the attached details for your records."
      };

      try {
        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`[${i + 1}/${recipientList.length}] Sent to ${toEmail}`);
      } catch (err) {
        console.error(`Failed to send to ${toEmail}:`, err.message);
      }

      // 3-second delay between emails
      if (i < recipientList.length - 1) {
        await delay(3000);
      }
    }

    return res.json({
      success: true,
      message: `✅ Completed! Sent: ${successCount}/${recipientList.length}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Server Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer active on port ${PORT}`);
});
