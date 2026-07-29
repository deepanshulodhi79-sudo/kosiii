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
      return res.json({ success: false, message: "❌ Fields required!" });
    }

    // Email list ko separate karna
    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    // Basic Gmail Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email.trim(),
        pass: password.replace(/\s+/g, '')
      }
    });

    let count = 0;

    for (const toEmail of recipientList) {
      // Direct Simple Mail Options (No HTML, Plain System Font)
      const mailOptions = {
        from: senderName ? `"${senderName}" <${email.trim()}>` : email.trim(),
        to: toEmail,
        subject: subject || "Update",
        text: message || ""
      };

      await transporter.sendMail(mailOptions);
      count++;
    }

    return res.json({
      success: true,
      message: `✅ Mails sent: ${count}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
