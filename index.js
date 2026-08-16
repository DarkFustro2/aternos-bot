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
  // Sürüm sorunu yasiyorsan 'false' yerine sunucu sürümünü string yazabilirsin (ör. version: '1.21.1')
  version: false 
};

function createBot() {
  console.log('[Bot] Sunucuya baglaniliyor...');
  const bot = mineflayer.createBot(botOptions);

  let afkInterval;

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

  // Sunucudan dusme / atilma durumunda temizlik ve yeniden baglanma
  bot.on('end', (reason) => {
    console.log(`[Bot] Baglanti kesildi. Sebep: ${reason}`);
    clearInterval(afkInterval);
    console.log('[Bot] 15 saniye sonra tekrar baglanilacak...');
    setTimeout(createBot, 15000);
  });

  bot.on('kicked', (reason) => {
    console.log('[Bot] Sunucudan atildi. Sebep:', reason);
  });

  bot.on('error', (err) => {
    console.log('[Bot] Hata olustu:', err.message);
  });
}

// Botu baslat
createBot();
