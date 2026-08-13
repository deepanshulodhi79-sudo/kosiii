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

// Helper: Split recipients into chunks
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

    // Gmail Transporter with Pool enabled to reuse SMTP connections safely
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 5,
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
        const mailSubject = subject ? subject.trim() : "Notification Update";
        const bodyContent = message ? message.trim() : "Hello, please find the updated details attached.";
        
        // Clean line breaks for HTML formatting
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>${bodyContent.replace(/\n/g, '<br>')}</p>
          </div>
        `;

        const mailOptions = {
          from: `"${nameTag}" <${cleanEmail}>`,
          to: toEmail,
          replyTo: cleanEmail,
          subject: mailSubject,
          text: bodyContent,
          html: htmlBody,
          headers: {
            'X-Mailer': 'NodeMailer Standard Client',
            'X-Priority': '3',
            'Importance': 'normal'
          }
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

      // Execute batch in parallel
      await Promise.all(promises);
    }

    transporter.close();

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
