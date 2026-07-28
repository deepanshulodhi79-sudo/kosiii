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

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: email.trim(),
        pass: password.replace(/\s+/g, '')
      }
    });

    let successCount = 0;

    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];
      const textMessage = message || "Hello, please check the details attached.";

      const mailOptions = {
        from: `"${senderName || 'Sender'}" <${email.trim()}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        text: textMessage,
        
        // 📧 Clean, Simple & Normal Email Font (Standard Email Format)
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000; line-height: 1.5;">
            ${textMessage.replace(/\n/g, '<br>')}
          </div>
        `,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'X-Mailer': 'Nodemailer'
        }
      };

      await transporter.sendMail(mailOptions);
      successCount++;

      // Delay between emails to avoid spam filters
      if (i < recipientList.length - 1) {
        await delay(1500);
      }
    }

    return res.json({
      success: true,
      message: `✅ Mail successfully sent: ${successCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `❌ Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer active on port ${PORT}`);
});
