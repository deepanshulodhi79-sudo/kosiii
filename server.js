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

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanEmail,
        pass: cleanPassword
      }
    });

    let successCount = 0;
    let failedCount = 0;

    const batches = chunkArray(recipientList, 5);

    for (const batch of batches) {
      const promises = batch.map(toEmail => {
        const nameTag = senderName ? senderName.trim() : cleanEmail.split('@')[0];
        const mailSubject = subject ? subject.trim() : "NANCY";
        const bodyContent = message ? message.trim() : "HI,\n\nI NOTICE YOUR WEBSITE LACKS VISIBILITY ON SEARCH ENGINES.\n\nMAY I SEND YOU A REPORT AND BEST QUOTE/PACKAGES?\n\nTHANKS,";

        // Clean HTML Without Ref Code or Tracking text
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6;">
            ${bodyContent.replace(/\n/g, '<br>')}
          </div>
        `;

        const mailOptions = {
          from: `"${nameTag}" <${cleanEmail}>`,
          to: toEmail,
          replyTo: cleanEmail,
          subject: mailSubject,
          text: bodyContent,
          html: htmlBody
        };

        return transporter.sendMail(mailOptions)
          .then(() => {
            successCount++;
            console.log(`[✓] Sent to ${toEmail}`);
          })
          .catch(err => {
            failedCount++;
            console.error(`[✗] Failed for ${toEmail}:`, err.message);
          });
      });

      await Promise.all(promises);
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
