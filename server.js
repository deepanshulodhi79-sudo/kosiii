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

// Direct Open (No Login)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    // Simple Direct Nodemailer Setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password.replace(/\s+/g, '')
      }
    });

    let successCount = 0;

    for (const toEmail of recipientList) {
      await transporter.sendMail({
        from: `"${senderName || 'Sender'}" <${email}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        text: message || "",
        html: `<p>${(message || "").replace(/\n/g, '<br>')}</p>`
      });
      successCount++;
    }

    return res.json({
      success: true,
      message: `✅ Done! Sent ${successCount} mail(s).`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer running on http://localhost:${PORT}`);
});
