const mineflayer = require('mineflayer');
const http = require('http');

// Render web sunucusu (Uyumamak ve aktif kalmak için)
http.createServer((req, res) => {
    res.write("Bot 7/24 Aktif!");
    res.end();
}).listen(process.env.PORT || 3000);

// ATERNOS BİLGİLERİN
const SUNUCU_IP = 'goodbridgesmp.aternos.me';
const SUNUCU_PORT = 30769;

let bot = null;

function botuBaslat() {
    // RAM sızıntısını önlemek için eski botu tamamen bellekten temizle
    if (bot) {
        bot.removeAllListeners();
        bot = null;
    }

    console.log(`[${new Date().toLocaleTimeString()}] ${SUNUCU_IP}:${SUNUCU_PORT} sunucusuna bağlanılıyor...`);

    bot = mineflayer.createBot({
        host: SUNUCU_IP,
        port: SUNUCU_PORT,
        username: 'GoodBridgeSMP',
        version: "1.21.11", // Tam istediğin sürüm!
        checkTimeoutInterval: 90000
    });

    bot.on('spawn', () => {
        console.log("✅ Bot BAŞARIYLA oyuna girdi! Nöbet başladı.");
        
        // 45 saniyede bir hafif zıplama ve etrafa bakış
        setInterval(() => {
            if (bot && bot.entity) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);

                const yaw = Math.random() * Math.PI * 2;
                bot.look(yaw, 0, false);
            }
        }, 45000);

        // 3 dakikada bir otomatik /help komutu yazarak AFK kalmayı engeller
        setInterval(() => {
            if (bot && bot.player) {
                bot.chat("/help");
            }
        }, 180000);
    });

    bot.on('kicked', (reason) => {
        console.log("⚠️ Sunucudan atıldı. Sebep:", JSON.stringify(reason));
    });

    bot.on('end', () => {
        console.log("⚠️ Bağlantı koptu, 20 saniye sonra temiz bağlanılacak...");
        setTimeout(botuBaslat, 20000);
    });

    bot.on('error', (err) => {
        console.log("❌ Bağlantı hatası:", err.message);
    });
}

botuBaslat();
