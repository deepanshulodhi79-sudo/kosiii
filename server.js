require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

// Safe Delay Helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "❌ Sabhi required fields bharna zaroori hai!" });
    }

    const cleanEmail = email.trim();
    const cleanPassword = password.replace(/\s+/g, '');

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      return res.json({ success: false, message: "❌ Kam se kam ek valid recipient email dalein." });
    }

    // Clean Transporter Setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    let successCount = 0;
    let failedCount = 0;

    // Sequential Loop with 2-second Gap
    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];
      const nameTag = senderName ? senderName.trim() : cleanEmail.split('@')[0];
      const mailSubject = subject ? subject.trim() : "Website Inquiry";
      
      const emailContent = message ? message.trim() : "Hi, hope you are doing well.";

      const mailOptions = {
        from: `"${nameTag}" <${cleanEmail}>`,
        to: toEmail,
        subject: mailSubject,
        text: emailContent,
        html: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222222; line-height: 1.6;">
                ${emailContent.replace(/\n/g, '<br>')}
              </div>`
      };

      try {
        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`[✓] Sent to ${toEmail}`);
      } catch (err) {
        failedCount++;
        console.error(`[✗] Failed for ${toEmail}:`, err.message);
      }

      // 2-second safe pause to avoid burst rate limiting
      if (i < recipientList.length - 1) {
        await sleep(2000);
      }
    }

    return res.json({
      success: true,
      message: `✅ Process Completed! Sent: ${successCount}, Failed: ${failedCount}`
    });

  } catch (err) {
    console.error("Server Error:", err.message);
    return res.json({ success: false, message: `❌ Server Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer active on port ${PORT}`);
});
