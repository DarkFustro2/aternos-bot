const mineflayer = require('mineflayer');
const http = require('http');

console.log("🚀 Bot scripti başlatılıyor...");

// Render web sunucusu (Render'ın kapanmaması için)
http.createServer((req, res) => {
    res.write("Bot 7/24 Aktif!");
    res.end();
}).listen(process.env.PORT || 3000, () => {
    console.log("🌐 Web sunucusu 3000 portunda dinleniyor.");
});

// ATERNOS BİLGİLERİN
const SUNUCU_IP = 'goodbridgesmp.aternos.me';
const SUNUCU_PORT = 30769;

function botuBaslat() {
    console.log(`[${new Date().toLocaleTimeString()}] 🔌 ${SUNUCU_IP}:${SUNUCU_PORT} adresine baglanti istegi gonderiliyor...`);

    try {
        const bot = mineflayer.createBot({
            host: SUNUCU_IP,
            port: SUNUCU_PORT,
            username: 'GoodBridgeSMP',
            version: "1.21.1", // Mineflayer 1.21.x protokol paketlerini bu surumle kararlı baslatir
            checkTimeoutInterval: 60000
        });

        bot.on('spawn', () => {
            console.log("✅ BOOOM! Bot basariyla sunucuya girdi!");
            
            // 45 saniyede bir ziplama ve bakis
            setInterval(() => {
                if (bot && bot.entity) {
                    bot.setControlState('jump', true);
                    setTimeout(() => bot.setControlState('jump', false), 500);

                    const yaw = Math.random() * Math.PI * 2;
                    bot.look(yaw, 0, false);
                }
            }, 45000);

            // 3 dakikada bir /help komutu
            setInterval(() => {
                if (bot && bot.player) {
                    bot.chat("/help");
                }
            }, 180000);
        });

        bot.on('kicked', (reason) => {
            console.log("⚠️ Sunucudan atildi. Nedeni:", JSON.stringify(reason));
        });

        bot.on('end', () => {
            console.log("⚠️ Baglanti koptu. 20 saniye sonra tekrar denenecek...");
            setTimeout(botuBaslat, 20000);
        });

        bot.on('error', (err) => {
            console.log("❌ Mineflayer Hatasi:", err.message);
        });

    } catch (err) {
        console.log("❌ Bot olusturulurken kritik hata:", err.message);
        setTimeout(botuBaslat, 20000);
    }
}

// Botu ilk kez tetikle
botuBaslat();
