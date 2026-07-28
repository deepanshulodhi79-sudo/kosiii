async function sendMails() {
  const sendBtn = document.getElementById('sendBtn');
  const statusMsg = document.getElementById('statusMessage');

  const senderName = document.getElementById('senderName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('pass').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;
  const recipients = document.getElementById('recipients').value;

  if (!email || !password || !recipients) {
    statusMsg.style.color = 'red';
    statusMsg.innerText = '❌ Fill Email, App Password, and Recipients!';
    return;
  }

  sendBtn.disabled = true;
  statusMsg.style.color = '#555';
  statusMsg.innerText = '⏳ Sending emails...';

  try {
    const res = await fetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderName, email, password, subject, message, recipients })
    });

    const data = await res.json();
    statusMsg.style.color = data.success ? 'green' : 'red';
    statusMsg.innerText = data.message;
  } catch (err) {
    statusMsg.style.color = 'red';
    statusMsg.innerText = '❌ Error sending request.';
  } finally {
    sendBtn.disabled = false;
  }
}
