const mineflayer = require('mineflayer');
const express = require('express');
const https = require('https');
const http = require('http');

// --- 1. RENDER İÇİN WEB SUNUCUSU VE SELF-PING ---
const app = express();
const PORT = process.env.PORT || 3000;

// BURAYA RENDER SİTE ADRESİNİ YAZ (örnek: https://aternos-bot.onrender.com)
// Eğer boş bırakırsan varsayılan olarak localhost kullanır.
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || '';

app.get('/', (req, res) => {
  const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  res.send(`Bot servisi aktif! Anlik RAM Kullanimi: ${memoryUsage} MB`);
});

app.listen(PORT, () => {
  console.log(`[Web] Sunucu ${PORT} portunda baslatildi.`);
});

// Render'ı uyanik tutmak icın 2 dakikada bir istek atan sistem
setInterval(() => {
  const url = RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const client = url.startsWith('https') ? https : http;

  client.get(url, (res) => {
    console.log(`[Self-Ping] Ping gonderildi (${url}), durum koda: ${res.statusCode}`);
  }).on('error', (err) => {
    console.log('[Self-Ping] Hata:', err.message);
  });
}, 2 * 60 * 1000); // 2 dakika

// --- 2. MINECRAFT BOT VE RAM OPTİMİZASYONU ---
const botOptions = {
  host: 'goodbridgesmp.aternos.me',
  port: 30769,
  username: 'GoodBridgeSMP',
  version: false,
  // RAM Tasarrufu icın kritik ayarlar:
  checkTimeoutInterval: 60 * 1000,
  physicsEnabled: true
};

let isReconnecting = false;

function createBot() {
  console.log('[Bot] Sunucuya baglaniliyor...');
  isReconnecting = false;

  const bot = mineflayer.createBot(botOptions);
  let afkInterval = null;

  bot.on('spawn', () => {
    console.log('[Bot] Sunucuya basariyla giris yapildi!');

    // Anti-AFK Döngüsü (Her 30 saniyede bir)
    afkInterval = setInterval(() => {
      if (!bot || !bot.entity) return;

      // 1. Komut Gönder
      bot.chat('/help');

      // 2. Hafif Ziplama Hareketi
      bot.setControlState('jump', true);
      setTimeout(() => {
        if (bot) bot.setControlState('jump', false);
      }, 500);

      // 3. Rastgele Etrafa Bakma
      const yaw = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI;
      bot.look(yaw, pitch, true);

      // RAM Temizliği: Gereksiz entity (varlik) verilerini hafizadan sil
      if (bot.entities) {
        Object.keys(bot.entities).forEach((id) => {
          if (bot.entities[id] && bot.entities[id] !== bot.entity) {
            delete bot.entities[id];
          }
        });
      }

      const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      console.log(`[Anti-AFK] Hareket edildi. Mevcut RAM: ${memMB} MB`);
    }, 30 * 1000);
  });

  bot.on('kicked', (reason) => {
    const reasonStr = JSON.stringify(reason);
    console.log('[Bot] Sunucudan atildi. Sebep:', reasonStr);

    if (reasonStr.includes('duplicate_login')) {
      console.log('[Bot] Oturumun dusmesi icin 45 saniye bekleniyor...');
      reconnect(45000);
    }
  });

  bot.on('end', (reason) => {
    console.log(`[Bot] Baglanti kesildi. Sebep: ${reason}`);
    if (afkInterval) clearInterval(afkInterval);
    reconnect(30000);
  });

  bot.on('error', (err) => {
    console.log('[Bot] Hata olustu:', err.message);
  });

  function reconnect(delay) {
    if (isReconnecting) return;
    isReconnecting = true;

    if (afkInterval) clearInterval(afkInterval);
    console.log(`[Bot] ${delay / 1000} saniye sonra tekrar baglanilacak...`);

    setTimeout(() => {
      createBot();
    }, delay);
  }
}

// Botu baslat
createBot();
