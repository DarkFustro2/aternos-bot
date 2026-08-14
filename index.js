const mineflayer = require('mineflayer');
const http = require('http');

// Render'ın botu uyutmaması için minik bir web sunucusu
http.createServer((req, res) => {
    res.write("Bot 7/24 Aktif!");
    res.end();
}).listen(process.env.PORT || 3000);

// ATERNOS BİLGİLERİN
const SUNUCU_IP = 'goodbridgesmp.aternos.me'; // Kendi Aternos IP'ni yaz!
const SUNUCU_PORT = 30769;                   // Portun varsa değiştir!

function botuBaslat() {
    console.log("Aternos sunucusuna bağlanılıyor...");

    const bot = mineflayer.createBot({
        host: SUNUCU_IP,
        port: SUNUCU_PORT,
        username: 'Aternos_Nobetci',
        version: '1.21.11'
    });

    bot.on('spawn', () => {
        console.log("✅ Bot Aternos'a girdi! Sunucu açık kalacak.");
        
        // Düşmemek için 2 dakikada bir zıplar
        setInterval(() => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }, 120000);
    });

    bot.on('end', () => {
        console.log("⚠️ Bağlantı koptu, 15 saniye sonra tekrar bağlanıyor...");
        setTimeout(botuBaslat, 15000);
    });

    bot.on('error', (err) => console.log("Hata:", err.message));
}

botuBaslat();
