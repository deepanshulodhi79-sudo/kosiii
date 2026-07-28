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

// Delay helper (Gmail ko rapid-fire mail bhejkar triggering se bachane ke liye)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "❌ All fields are required!" });
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    // Direct Gmail Transport with Secure Port
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // TLS
      auth: {
        user: email.trim(),
        pass: password.replace(/\s+/g, '') // Remove spaces from App Password
      }
    });

    let successCount = 0;

    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];
      const textMessage = message || "Hello, please check the update.";

      // 🛑 INBOX FIX: Proper MIME Headers & Format
      const mailOptions = {
        from: `"${senderName || 'Sender'}" <${email.trim()}>`, // Sender format
        to: toEmail,
        subject: subject || "Quick Update",
        text: textMessage, // Plain text fallback (Crucial for Gmail)
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
            <p>${textMessage.replace(/\n/g, '<br>')}</p>
          </div>
        `,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'X-Mailer': 'Nodemailer',
          'MIME-Version': '1.0'
        }
      };

      await transporter.sendMail(mailOptions);
      successCount++;

      // ⏱️ Anti-Spam Delay (1.5 second gap between each email)
      if (i < recipientList.length - 1) {
        await delay(1500);
      }
    }

    return res.json({
      success: true,
      message: `✅ Success! ${successCount} mail(s) delivered.`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer running on http://localhost:${PORT}`);
});
