require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware (Express in-built body parser)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Home Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

// Helper Delay Function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mail Sending Route
app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    // Validation
    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "❌ Sabhi required fields bharna zaroori hai!" });
    }

    // Clean Email & Password
    const cleanEmail = email.trim();
    const cleanPassword = password.replace(/\s+/g, '');

    // Process Recipients List
    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      return res.json({ success: false, message: "❌ Kam se kam ek valid recipient email dalein." });
    }

    // Transporter Setup (Gmail Service)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    let successCount = 0;
    let failedCount = 0;

    // Process Loop
    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];
      const nameTag = senderName ? senderName.trim() : cleanEmail.split('@')[0];

      const mailOptions = {
        from: `"${nameTag}" <${cleanEmail}>`,
        to: toEmail,
        subject: subject ? subject.trim() : "Important Information Notice",
        text: message ? message.trim() : "Hello, please review the details."
      };

      try {
        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`[${i + 1}/${recipientList.length}] ✓ Sent to ${toEmail}`);
      } catch (err) {
        failedCount++;
        console.error(`[${i + 1}/${recipientList.length}] ✗ Failed for ${toEmail}:`, err.message);
      }

      // 3-second delay between emails
      if (i < recipientList.length - 1) {
        await delay(3000);
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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Mailer active on port ${PORT}`);
});
