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
      return res.json({ success: false, message: "❌ Email, Password aur Recipients bharna zaroori hai!" });
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    // Standard Gmail Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email.trim(),
        pass: password.replace(/\s+/g, '')
      }
    });

    let successCount = 0;

    for (const toEmail of recipientList) {
      const mailOptions = {
        from: senderName ? `"${senderName}" <${email.trim()}>` : email.trim(),
        to: toEmail,
        subject: subject || "Important Notice",
        text: message || ""
      };

      await transporter.sendMail(mailOptions);
      successCount++;
    }

    return res.json({
      success: true,
      message: `✅ Mails sent successfully: ${successCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
