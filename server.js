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

// Short delay for natural execution (1 second)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "❌ Email, Password aur Recipients zaroori hain!" });
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    const cleanEmail = email.trim();
    const cleanPassword = password.replace(/\s+/g, '');
    const cleanSender = senderName ? senderName.trim() : 'Sender';

    // Simple Direct Gmail Transport
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    let successCount = 0;

    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];
      const textContent = message || "";

      const mailOptions = {
        from: `"${cleanSender}" <${cleanEmail}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        text: textContent,
        html: `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #111111; line-height: 1.5;">${textContent.replace(/\n/g, '<br>')}</div>`,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal'
        }
      };

      try {
        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`[${i + 1}/${recipientList.length}] Sent to ${toEmail}`);
      } catch (err) {
        console.error(`Error sending to ${toEmail}:`, err.message);
      }

      if (i < recipientList.length - 1) {
        await delay(1000);
      }
    }

    return res.json({
      success: true,
      message: `✅ Processed ${successCount} mail(s) successfully!`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Server Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Mailer active on http://localhost:${PORT}`);
});
