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
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    let successCount = 0;

    for (const toEmail of recipientList) {
      await transporter.sendMail({
        from: `"${senderName || 'Sender'}" <${cleanEmail}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        text: message || ""
      });
      successCount++;
    }

    return res.json({
      success: true,
      message: `✅ Mails sent: ${successCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
