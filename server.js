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

// Direct Launcher Open (No Login/Logout)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

// Delay helper (Gmail spam filter se bachne ke liye)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/send', async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;

    if (!email || !password || !recipients) {
      return res.json({
        success: false,
        message: "❌ Email, App Password aur recipients zaruri hain!"
      });
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      return res.json({
        success: false,
        message: "❌ Sahi recipient email id dalein."
      });
    }

    // Gmail App Password Clean up (spaces hata do agar galti se copy-paste hue hon)
    const cleanPassword = password.replace(/\s+/g, '');

    // Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: cleanPassword
      }
    });

    // SMTP login check karein
    try {
      await transporter.verify();
    } catch (authErr) {
      return res.json({
        success: false,
        message: "❌ Gmail login fail! Make sure 16-digit App Password sahi hai aur 2-Step Verification ON hai."
      });
    }

    let successCount = 0;
    let failedCount = 0;

    // Har client ko ALAG-ALAG connection se bhejenge (INBOX Delivery ke liye)
    for (let i = 0; i < recipientList.length; i++) {
      const toEmail = recipientList[i];
      const textMsg = message || "";

      const mailOptions = {
        from: `"${senderName || 'Sender'}" <${email}>`,
        to: toEmail,
        subject: subject || "Quick Update",
        text: textMsg,
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 15px; color: #111; line-height: 1.5;">
            ${textMsg.replace(/\n/g, '<br>')}
          </div>
        `,
        // Headers jo Gmail ko bolte hain ki ye bulk bot nahi hai
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal'
        }
      };

      try {
        await transporter.sendMail(mailOptions);
        successCount++;
      } catch (err) {
        console.error(`Failed for ${toEmail}:`, err.message);
        failedCount++;
      }

      // Mails ke beech 2.5 second ka delay - ISSE SPAM DETECTION KAM HOTA HAI
      if (i < recipientList.length - 1) {
        await delay(2500);
      }
    }

    return res.json({
      success: true,
      message: `✅ Process Done! Bheja gaya: ${successCount} | Failed: ${failedCount}`
    });

  } catch (err) {
    return res.json({ success: false, message: `Server error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Mailer active on port ${PORT}`);
});
