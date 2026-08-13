require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

// Helper: Split array into chunks of 5
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

    // Direct Gmail SMTP connection with pooling
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL use kar rahe hain direct connection ke liye
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
        const domain = cleanEmail.split('@')[1] || 'gmail.com';
        const nameTag = senderName ? senderName.trim() : cleanEmail.split('@')[0];
        const mailSubject = subject ? subject.trim() : "Notification Update";
        const bodyContent = message ? message.trim() : "Hello, please review the attached details.";
        
        // Anti-Spam unique identifiers
        const uniqueString = crypto.randomBytes(6).toString('hex');
        const messageId = `<${Date.now()}.${uniqueString}@${domain}>`;

        // Gmail spam bypass: Dynamic HTML structure with hidden token
        const htmlBody = `
          <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222222; line-height: 1.5;">
            <div>${bodyContent.replace(/\n/g, '<br>')}</div>
            <br><br>
            <hr style="border: none; border-top: 1px solid #eeeeee;" />
            <p style="font-size: 11px; color: #888888; margin-top: 8px;">
              Ref Code: ${uniqueString.toUpperCase()} | Sent to ${toEmail}
            </p>
            <!-- Anti-Spam Tracking Token: ${uniqueString} -->
          </div>
        `;

        const mailOptions = {
          from: `"${nameTag}" <${cleanEmail}>`,
          to: toEmail,
          replyTo: cleanEmail,
          subject: mailSubject,
          text: `${bodyContent}\n\n---\nRef Code: ${uniqueString.toUpperCase()}`,
          html: htmlBody,
          messageId: messageId,
          headers: {
            'X-Entity-Ref-ID': uniqueString,
            'X-Auto-Response-Suppress': 'OOF, AutoReply'
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

      // Speed 5-5 parallel batch execution
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
