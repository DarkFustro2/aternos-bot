const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const { LiveChat } = require('youtube-chat');

// --- 1. EXPRESS & SOCKET.IO SUNUCUSU ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

let botInstance = null;
let ytLiveChat = null;

// Spam Engelleme İçin Mesaj Kuyruğu (Her 1.2 saniyede 1 mesaj gönderir)
const messageQueue = [];

setInterval(() => {
  if (messageQueue.length > 0 && botInstance && botInstance.entity) {
    const msg = messageQueue.shift();
    botInstance.chat(msg);
  }
}, 1200);

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
        input[type="text"] { width: 60%; background: #383838; color: #fff; }
        button { background: #55FF55; color: #000; font-weight: bold; cursor: pointer; }
        button:hover { background: #33CC33; }
        .danger { background: #FF5555; color: #fff; }
        .danger:hover { background: #CC3333; }
        #console { background: #000; color: #00FF00; padding: 10px; height: 300px; overflow-y: scroll; font-family: monospace; border-radius: 5px; }
        .status { font-weight: bold; padding: 5px 10px; border-radius: 4px; display: inline-block; }
        .status-off { background: #555; color: #fff; }
        .status-on { background: #55FF55; color: #000; }
      </style>
    </head>
    <body>
      <h2>GoodBridgeSMP Bot & Live Chat Paneli</h2>
      
      <div class="card">
        <h3>YouTube Canlı Yayın Entegrasyonu</h3>
        <p>Durum: <span id="ytStatus" class="status status-off">KAPALI</span></p>
        <input type="text" id="liveInput" placeholder="YouTube Canlı Yayın Linki veya Video ID yaz...">
        <button onclick="startLive()">Yayın Sohbetini AÇ</button>
        <button class="danger" onclick="stopLive()">Yayın Sohbetini KAPAT</button>
      </div>

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
        const ytStatus = document.getElementById('ytStatus');

        socket.on('log', (data) => {
          const p = document.createElement('div');
          p.textContent = data;
          consoleDiv.appendChild(p);
          consoleDiv.scrollTop = consoleDiv.scrollHeight;
        });

        socket.on('yt_status', (active) => {
          if (active) {
            ytStatus.textContent = "AÇIK (Canlı Yayın Dinleniyor)";
            ytStatus.className = "status status-on";
          } else {
            ytStatus.textContent = "KAPALI";
            ytStatus.className = "status status-off";
          }
        });

        function sendChat() {
          const input = document.getElementById('chatInput');
          if (input.value) {
            socket.emit('send_chat', input.value);
            input.value = '';
          }
        }

        function startLive() {
          const input = document.getElementById('liveInput');
          if (input.value) {
            socket.emit('start_yt_live', input.value);
          }
        }

        function stopLive() {
          socket.emit('stop_yt_live');
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

// YouTube Chat Başlatma
function setupYouTubeChat(liveUrlOrId) {
  let channelOrVideoId = liveUrlOrId;
  if (liveUrlOrId.includes('v=')) {
    channelOrVideoId = liveUrlOrId.split('v=')[1].split('&')[0];
  } else if (liveUrlOrId.includes('youtu.be/')) {
    channelOrVideoId = liveUrlOrId.split('youtu.be/')[1].split('?')[0];
  } else if (liveUrlOrId.includes('live/')) {
    channelOrVideoId = liveUrlOrId.split('live/')[1].split('?')[0];
  }

  stopYouTubeChat();

  try {
    ytLiveChat = new LiveChat({ liveId: channelOrVideoId });

    ytLiveChat.on('chat', (chatItem) => {
      const author = chatItem.author.name;
      const message = chatItem.message.map((m) => m.text).join('');
      const fullMsg = `[Live | ${author}]: ${message}`;

      logToWeb(`[YouTube Chat] ${author}: ${message}`);
      messageQueue.push(fullMsg);
    });

    ytLiveChat.on('error', (err) => {
      logToWeb('[YouTube Hata]: ' + err.message);
    });

    ytLiveChat.start().then((ok) => {
      if (ok) {
        logToWeb('[YouTube Chat] Canlı yayın chati dinlenmeye başlandı!');
        io.emit('yt_status', true);
      } else {
        logToWeb('[YouTube Chat] Canlı yayına bağlanılamadı.');
        io.emit('yt_status', false);
      }
    });
  } catch (err) {
    logToWeb('[YouTube Kurulum Hatası]: ' + err.message);
    io.emit('yt_status', false);
  }
}

function stopYouTubeChat() {
  if (ytLiveChat) {
    ytLiveChat.stop();
    ytLiveChat = null;
    messageQueue.length = 0;
    logToWeb('[YouTube] Chat dinlemesi durduruldu.');
    io.emit('yt_status', false);
  }
}

// Socket Bağlantıları
io.on('connection', (socket) => {
  logToWeb('[Panel] Kontrol paneline bağlandı.');
  socket.emit('yt_status', ytLiveChat !== null);

  socket.on('send_chat', (msg) => {
    if (botInstance) {
      botInstance.chat(msg);
      logToWeb(`[Web -> Oyun] Gönderildi: ${msg}`);
    }
  });

  socket.on('start_yt_live', (link) => {
    setupYouTubeChat(link);
  });

  socket.on('stop_yt_live', () => {
    stopYouTubeChat();
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

      // Anti-AFK Hareket (Zıplama & Kafayı Döndürme)
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

  // Oyun İçi Chat Loglama (Arayüzde görmek için)
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
