const mineflayer = require('mineflayer');
const http = require('http');
const https = require('https');

// Render'ın URL adresin (Render panelinden kendi linkinle değiştir)
const RENDER_URL = 'https://aternos-bot-v9yi.onrender.com';

// Render web sunucusu
http.createServer((req, res) => {
    res.write("Bot 7/24 Aktif!");
    res.end();
}).listen(process.env.PORT || 3000);

// KENDİ KENDİNE PİNG ATMA (Render'ın uyumasını engeller)
setInterval(() => {
    https.get(RENDER_URL, (res) => {
        console.log("⏰ Render'a ping atıldı, site uykuya geçmeyecek.");
    }).on('error', (err) => {
        console.log("Ping hatası:", err.message);
    });
}, 8 * 60 * 1000); // 8 dakikada bir otomatik tık atar

// ATERNOS BİLGİLERİN
const SUNUCU_IP = 'goodbridgesmp.aternos.me'; // Kendi Aternos IP'ni yaz!
const SUNUCU_PORT = 30769;

function botuBaslat() {
    console.log("Aternos sunucusuna bağlanılıyor...");

    const bot = mineflayer.createBot({
        host: SUNUCU_IP,
        port: SUNUCU_PORT,
        username: 'Aternos_Nobetci',
        checkTimeoutInterval: 60000
    });

    bot.on('spawn', () => {
        console.log("✅ Bot GERÇEKTEN sunucuya girdi! Sunucu açık kalacak.");
        
        // 45 saniyede bir zıpla ve etrafına bak
        setInterval(() => {
            if (bot && bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);

                const yaw = Math.random() * Math.PI * 2;
                const pitch = (Math.random() - 0.5) * Math.PI;
                bot.look(yaw, pitch, false);
            }
        }, 45000);

        // 3 dakikada bir chat mesajı
        setInterval(() => {
            if (bot) {
                bot.chat("/me nöbette!");
            }
        }, 180000);
    });

    bot.on('kicked', (reason) => console.log("⚠️ Atıldı, sebep:", reason));
    bot.on('end', () => {
        console.log("⚠️ Bağlantı koptu, 15 saniye sonra tekrar deneniyor...");
        setTimeout(botuBaslat, 15000);
    });
    bot.on('error', (err) => console.log("❌ Hata:", err.message));
}

botuBaslat();
