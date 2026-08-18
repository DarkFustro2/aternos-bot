const mineflayer = require('mineflayer');
const express = require('express');
const https = require('https');
const http = require('http');

// --- 1. RENDER İÇİN WEB SUNUCUSU VE UYANIK TUTMA (SELF-PING) ---
const app = express();
const PORT = process.env.PORT || 3000;

// Render üzerinde çalışan uygulamanın kendi dış adresini otomatik algılama
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.get('/', (req, res) => {
  const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  res.send(`Bot aktif! Anlik RAM Kullanimi: ${memoryUsage} MB`);
});

app.listen(PORT, () => {
  console.log(`[Web] Sunucu ${PORT} portunda baslatildi.`);
});

// Render'ı uyanık tutmak için 2 dakikada bir istek gönderen kod
setInterval(() => {
  const client = RENDER_URL.startsWith('https') ? https : http;

  client.get(RENDER_URL, (res) => {
    console.log(`[Self-Ping] İstek gönderildi (${RENDER_URL}), durum: ${res.statusCode}`);
  }).on('error', (err) => {
    console.log('[Self-Ping] Hata:', err.message);
  });
}, 2 * 60 * 1000); // 2 dakika

// --- 2. MINECRAFT BOT & RAM OPTİMİZASYONU ---
const botOptions = {
  host: 'goodbridgesmp.aternos.me',
  port: 30769,
  username: 'GoodBridgeSMP',
  version: false,
  checkTimeoutInterval: 60 * 1000
};

let isReconnecting = false;

function createBot() {
  console.log('[Bot] Sunucuya bağlanılıyor...');
  isReconnecting = false;

  const bot = mineflayer.createBot(botOptions);
  let afkInterval = null;

  bot.on('spawn', () => {
    console.log('[Bot] Sunucuya başarıyla giriş yapıldı!');

    // Anti-AFK ve RAM Temizleme Döngüsü (Her 30 saniyede bir)
    afkInterval = setInterval(() => {
      if (!bot || !bot.entity) return;

      // 1. Komut Gönder
      bot.chat('/help');

      // 2. Hafif Zıplama Hareketi
      bot.setControlState('jump', true);
      setTimeout(() => {
        if (bot) bot.setControlState('jump', false);
      }, 500);

      // 3. Rastgele Etrafa Bakma
      const yaw = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI;
      bot.look(yaw, pitch, true);

      // --- KOD İÇİ RAM TEMİZLİĞİ ---
      // Çevredeki gereksiz varlıkları (entity/mob/eşya) hafızadan sil
      if (bot.entities) {
        Object.keys(bot.entities).forEach((id) => {
          if (bot.entities[id] && bot.entities[id] !== bot.entity) {
            delete bot.entities[id];
          }
        });
      }

      // Manuel Garbage Collection (Çöp Toplayıcı) Çağrısı
      if (global.gc) {
        global.gc();
      }

      const memUsed = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`[Anti-AFK] Hareket edildi ve /help yazıldı. RAM: ${memUsed.toFixed(2)} MB`);

      // Eğer RAM 250 MB üzerine çıkarsa ekstra önbellek temizliği yap
      if (memUsed > 250 && bot._client) {
        console.log('[RAM Uyarısı] Bellek kullanımı yüksek, temizlik yapılıyor...');
        if (global.gc) global.gc();
      }
    }, 30 * 1000);
  });

  bot.on('kicked', (reason) => {
    const reasonStr = JSON.stringify(reason);
    console.log('[Bot] Sunucudan atıldı. Sebep:', reasonStr);

    if (reasonStr.includes('duplicate_login')) {
      console.log('[Bot] Çift giriş algılandı. Oturumun düşmesi için 45 saniye bekleniyor...');
      reconnect(45000);
    }
  });

  bot.on('end', (reason) => {
    console.log(`[Bot] Bağlantı kesildi. Sebep: ${reason}`);
    if (afkInterval) clearInterval(afkInterval);
    reconnect(30000);
  });

  bot.on('error', (err) => {
    console.log('[Bot] Hata oluştu:', err.message);
  });

  function reconnect(delay) {
    if (isReconnecting) return;
    isReconnecting = true;

    if (afkInterval) clearInterval(afkInterval);
    console.log(`[Bot] ${delay / 1000} saniye sonra tekrar bağlanılacak...`);

    setTimeout(() => {
      createBot();
    }, delay);
  }
}

// Botu başlat
createBot();
