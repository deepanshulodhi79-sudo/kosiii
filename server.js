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

// Helper: Batch Chunking
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Secret Trick 1: Invisible Zero-Width character injection to break Spam Fingerprints
const randomizeTextInvisibly = (text) => {
  const invisibleChar = '\u200B'; // Invisible character
  return text.split('').map(char => (Math.random() < 0.15 ? char + invisibleChar : char)).join('');
};

// Secret Trick 2: Dynamic Greeting Spintax
const getRandomGreeting = () => {
  const greetings = ["HI,", "Hello,", "Hey,", "Hi there,"];
  return greetings[Math.floor(Math.random() * greetings.length)];
};

const getRandomClosing = () => {
  const closings = ["THANKS,", "REGARDS,", "BEST REGARDS,", "THANKS & REGARDS,"];
  return closings[Math.floor(Math.random() * closings.length)];
};

// Helper: Micro Pause (300ms) to avoid Gmail burst detection
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

    // SMTP Pool Enabled for High Inbox Speed
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
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

        // Base content setup
        let rawMessage = message ? message.trim() : `${getRandomGreeting()}\n\nI NOTICE YOUR WEBSITE LACKS VISIBILITY ON SEARCH ENGINES.\n\nMAY I SEND YOU A REPORT AND BEST QUOTE/PACKAGES?\n\n${getRandomClosing()}`;

        // Inject invisible variations to bypass spam filters
        const uniqueText = randomizeTextInvisibly(rawMessage);

        const htmlBody = `
          <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #111111; line-height: 1.6;">
            ${uniqueText.replace(/\n/g, '<br>')}
          </div>
        `;

        const mailOptions = {
          from: `"${nameTag}" <${cleanEmail}>`,
          to: toEmail,
          replyTo: cleanEmail,
          subject: mailSubject,
          text: uniqueText,
          html: htmlBody,
          headers: {
            'X-Mailer': 'Microsoft Outlook 16.0', // Impersonates standard desktop mail client
            'X-Priority': '3',
            'Priority': 'normal'
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

      await Promise.all(promises);
      await sleep(300); // 300 milliseconds micro-pause between 5-email batches
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
