const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// --- ŞİFRELEME AYARI ---
const KULLANICI_ADI = 'DarqFustro';
const SIFRE = '1234five';

// Basic Auth (Siteye Şifreli Giriş)
app.use((req, res, next) => {
  // Python scriptinin gönderdiği sohbet mesajlarını şifresiz kabul et
  if (req.path === '/api/yt-chat') return next();

  const auth = { login: KULLANICI_ADI, password: SIFRE };
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Giris Reddedildi: Yanlis Kullanici Adi veya Sifre!');
});

let botInstance = null;

// Spam Engelleme İçin Mesaj Kuyruğu
const messageQueue = [];

// YouTube Mesajlarını Minecraft Chatine /tellraw İle Bas (Turuncu Etiket)
setInterval(() => {
  if (messageQueue.length > 0 && botInstance && botInstance.entity) {
    const item = messageQueue.shift();

    // /tellraw formatı: <GoodBridgeSMP> takısını tamamen siler ve ismi TURUNCU basar!
    const tellrawObject = [
      { text: `[@${item.author}]: `, color: "gold", bold: true }, // Minecraft'ta canlı turuncu/altın rengi
      { text: item.message, color: "white" }
    ];

    botInstance.chat(`/tellraw @a ${JSON.stringify(tellrawObject)}`);
  }
}, 1200);

// Python Scriptinden Gelen Chat Mesajlarını Al
app.post('/api/yt-chat', (req, res) => {
  const { author, message } = req.body;
  if (author && message) {
    logToWeb(`[YouTube Chat] ${author}: ${message}`);
    messageQueue.push({ author, message });
    return res.json({ status: 'ok' });
  }
  res.status(400).json({ error: 'Eksik veri' });
});

// HTML Kontrol Paneli
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>GoodBridgeSMP Bot Paneli</title>
      <script src="/socket.io/socket.io.js"></script>
      <style>
        body { font-family: Arial, sans-serif; background: #181818; color: #fff; margin: 20px; }
        h2 { color: #55FF55; }
        .card { background: #282828; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        input, button { padding: 10px; border-radius: 4px; border: none; font-size: 14px; }
        input[type="text"] { width: 65%; background: #383838; color: #fff; }
        button { background: #55FF55; color: #000; font-weight: bold; cursor: pointer; }
        button:hover { background: #33CC33; }
        #console { background: #000; color: #00FF00; padding: 10px; height: 300px; overflow-y: scroll; font-family: monospace; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h2>GoodBridgeSMP Bot Paneli (Özel)</h2>

      <div class="card">
        <h3>Oyuna Mesaj / Komut Gönder</h3>
        <input type="text" id="chatInput" placeholder="Mesaj veya komut yaz (ör: /op DarkFustro)">
        <button onclick="sendChat()">Gönder</button>
      </div>

      <div class="card">
        <h3>Canlı Konsol ve Hatalar</h3>
        <div id="console"></div>
      </div>

      <script>
        const socket = io();
        const consoleDiv = document.getElementById('console');

        socket.on('log', (data) => {
          const p = document.createElement('div');
          p.textContent = data;
          consoleDiv.appendChild(p);
          consoleDiv.scrollTop = consoleDiv.scrollHeight;
        });

        function sendChat() {
          const input = document.getElementById('chatInput');
          if (input.value) {
            socket.emit('send_chat', input.value);
            input.value = '';
          }
        }
      </script>
    </body>
    </html>
  `);
});

function logToWeb(msg) {
  console.log(msg);
  io.emit('log', msg);
}

// Socket Bağlantıları
io.on('connection', (socket) => {
  logToWeb('[Panel] Kontrol paneline bağlandı.');

  socket.on('send_chat', (msg) => {
    if (botInstance) {
      botInstance.chat(msg);
      logToWeb(`[Web -> Oyun] Gönderildi: ${msg}`);
    }
  });
});

server.listen(PORT, () => {
  logToWeb(`[Web] Sunucu ${PORT} portunda başlatıldı.`);
});

// Self-Ping
setInterval(() => {
  const client = RENDER_URL.startsWith('https') ? https : http;
  client.get(RENDER_URL, (res) => {}).on('error', (err) => {});
}, 2 * 60 * 1000);

// --- 2. MINECRAFT BOT AYARLARI ---
const botOptions = {
  host: 'goodbridgesmp.aternos.me',
  port: 30769,
  username: 'GoodBridgeSMP',
  version: false,
  checkTimeoutInterval: 60 * 1000
};

let isReconnecting = false;

function createBot() {
  logToWeb('[Bot] Sunucuya bağlanılıyor...');
  isReconnecting = false;

  const bot = mineflayer.createBot(botOptions);
  botInstance = bot;
  let afkInterval = null;

  bot.on('spawn', () => {
    logToWeb('[Bot] Sunucuya başarıyla giriş yapıldı!');

    afkInterval = setInterval(() => {
      if (!bot || !bot.entity) return;

      // Anti-AFK Hareket
      bot.setControlState('jump', true);
      setTimeout(() => { if (bot) bot.setControlState('jump', false); }, 500);

      const yaw = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI;
      bot.look(yaw, pitch, true);

      // RAM Temizliği
      if (bot.entities) {
        Object.keys(bot.entities).forEach((id) => {
          if (bot.entities[id] && bot.entities[id] !== bot.entity) delete bot.entities[id];
        });
      }
      if (global.gc) global.gc();
    }, 30 * 1000);
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    logToWeb(`[MC Chat] <${username}>: ${message}`);
  });

  bot.on('kicked', (reason) => {
    const reasonStr = JSON.stringify(reason);
    logToWeb('[Bot] Sunucudan atıldı! Sebep: ' + reasonStr);

    if (reasonStr.includes('duplicate_login')) {
      reconnect(45000);
    }
  });

  bot.on('end', (reason) => {
    logToWeb(`[Bot] Bağlantı kesildi. Sebep: ${reason}`);
    if (afkInterval) clearInterval(afkInterval);
    reconnect(30000);
  });

  bot.on('error', (err) => {
    logToWeb('[Bot Hatası]: ' + err.message);
  });

  function reconnect(delay) {
    if (isReconnecting) return;
    isReconnecting = true;

    if (afkInterval) clearInterval(afkInterval);
    logToWeb(`[Bot] ${delay / 1000} saniye sonra tekrar bağlanılacak...`);

    setTimeout(() => {
      createBot();
    }, delay);
  }
}

// Botu başlat
createBot();
