require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Resend } = require('resend');
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

    // Resend API Key yahan use hogi (App password ki jagah Resend API Key daalein)
    const resend = new Resend(password); // User input field me 're_xxxx' API key dalein

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(Boolean);

    if (!recipientList.length) {
      return res.json({ success: false, message: "❌ Recipients ki list khali hai!" });
    }

    // Resend Default Safe Domain (Testing ke liye)
    // Dynamic domain ke liye Resend dashboard par domain add kar sakte hain
    const fromAddress = `${senderName || 'Notification'} <onboarding@resend.dev>`;

    let successCount = 0;

    for (const toEmail of recipientList) {
      const data = await resend.emails.send({
        from: fromAddress,
        to: [toEmail],
        subject: subject || "Important Note",
        text: message || "",
        html: `<p>${(message || "").replace(/\n/g, '<br>')}</p>`
      });

      if (data.id) successCount++;
    }

    return res.json({
      success: true,
      message: `✅ Mails Inbox me bhej diye gaye! (${successCount}/${recipientList.length})`
    });

  } catch (err) {
    return res.json({ success: false, message: `Error: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer Server Running on Port ${PORT}`);
});
