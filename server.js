* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

body {
  background-color: #f4f6f8;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.card {
  background: #ffffff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  width: 100%;
  max-width: 550px;
}

h2 {
  margin-bottom: 20px;
  color: #111827;
  font-size: 22px;
  text-align: center;
}

.input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

input, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

input:focus, textarea:focus {
  border-color: #2563eb;
}

textarea {
  height: 90px;
  margin-bottom: 12px;
  resize: vertical;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  background-color: #1d4ed8;
}

#statusMessage {
  margin-top: 15px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
}
