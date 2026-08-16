const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');

// --- 1. RENDER İÇİN WEB SUNUCUSU VE SELF-PING ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot servisi aktif ve uyanik!');
});

app.listen(PORT, () => {
  console.log(`[Web] Sunucu ${PORT} portunda baslatildi.`);
});

// Render'in web servisini uyutmamasi icın 2 dakikada bir istek atan sistem
setInterval(() => {
  http.get(`http://localhost:${PORT}`, (res) => {
    console.log('[Self-Ping] Ping gönderildi, Render uyanik tutuluyor.');
  }).on('error', (err) => {
    console.log('[Self-Ping] Hata:', err.message);
  });
}, 2 * 60 * 1000); // 2 dakika

// --- 2. MINECRAFT BOT AYARLARI ---
const botOptions = {
  host: 'goodbridgesmp.aternos.me',
  port: 30769,
  username: 'GoodBridgeSMP',
  version: false // Sunucu sürümünü otomatik algilar
};

let isReconnecting = false;

function createBot() {
  console.log('[Bot] Sunucuya baglaniliyor...');
  isReconnecting = false;
  
  const bot = mineflayer.createBot(botOptions);
  let afkInterval = null;

  bot.on('spawn', () => {
    console.log('[Bot] Sunucuya basariyla giris yapildi!');

    // Anti-AFK Döngüsü (Her 30 saniyede bir hareket eder ve /help yazar)
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

      console.log('[Anti-AFK] Hareket edildi ve /help yazildi.');
    }, 30 * 1000); // 30 saniye
  });

  // Sunucudan atilma durumu
  bot.on('kicked', (reason) => {
    const reasonStr = JSON.stringify(reason);
    console.log('[Bot] Sunucudan atildi. Sebep:', reasonStr);

    // Eger duplicate_login hatasi alindiysa oturumun dusmesi icin daha uzun bekle (45sn)
    if (reasonStr.includes('duplicate_login')) {
      console.log('[Bot] Ayni isimle giris tespit edildi. Oturumun dusmesi icin 45 saniye bekleniyor...');
      reconnect(45000);
    }
  });

  // Baglanti kesilmesi
  bot.on('end', (reason) => {
    console.log(`[Bot] Baglanti kesildi. Sebep: ${reason}`);
    if (afkInterval) clearInterval(afkInterval);
    
    // Eger kicked eventinde ozel reconnect tetiklenmediyse standart reconnect (30sn)
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

// Botu ilk kez baslat
createBot();
