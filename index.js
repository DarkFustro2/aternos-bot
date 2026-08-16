const express = require('express');
const mineflayer = require('mineflayer');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let bot = null;
let botDurumu = {
    durum: "Çevrimdışı",
    renk: "red",
    ip: "goodbridgesmp.aternos.me",
    port: 30769,
    kullaniciAdi: "GoodBridgeSMP",
    loglar: []
};

// Log ekleme fonksiyonu
function logEkle(mesaj) {
    const zaman = new Date().toLocaleTimeString();
    const yeniLog = `[${zaman}] ${mesaj}`;
    botDurumu.loglar.unshift(yeniLog);
    if (botDurumu.loglar.length > 25) botDurumu.loglar.pop();
    console.log(yeniLog);
}

// 🌐 WEB ARAYÜZÜ (HTML + CSS + CANLI CANLI OTOMATİK YENİLEME)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GoodBridgeSMP Bot Paneli</title>
        <style>
            * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; display: flex; justify-content: center; }
            .container { width: 100%; max-width: 650px; background: #1e293b; border-radius: 12px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
            h1 { text-align: center; color: #38bdf8; margin-top: 0; font-size: 24px; }
            .status-card { display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 15px 20px; border-radius: 8px; border-left: 5px solid #ef4444; margin-bottom: 20px; }
            .status-badge { font-weight: bold; padding: 6px 12px; border-radius: 20px; font-size: 14px; background: rgba(255,255,255,0.1); }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; color: #94a3b8; font-size: 14px; }
            input { width: 100%; padding: 10px 14px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 15px; outline: none; }
            input:focus { border-color: #38bdf8; }
            .btn-group { display: flex; gap: 10px; margin-top: 20px; }
            button { flex: 1; padding: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px; transition: 0.2s; }
            .btn-start { background: #22c55e; color: #fff; }
            .btn-start:hover { background: #16a34a; }
            .btn-stop { background: #ef4444; color: #fff; }
            .btn-stop:hover { background: #dc2626; }
            .logs-box { background: #090d16; border: 1px solid #334155; border-radius: 6px; height: 180px; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 13px; margin-top: 20px; color: #cbd5e1; }
            .log-line { margin-bottom: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚡ GoodBridgeSMP Bot Kontrol Paneli</h1>
            
            <div class="status-card" id="statusCard">
                <span>Durum: <strong id="statusText">Çevrimdışı</strong></span>
                <span class="status-badge" id="statusBadge">🔴 Kapalı</span>
            </div>

            <form id="botForm">
                <div class="form-group">
                    <label>Sunucu IP Adresi</label>
                    <input type="text" id="ip" value="${botDurumu.ip}" required>
                </div>
                <div class="form-group">
                    <label>Port</label>
                    <input type="number" id="port" value="${botDurumu.port}" required>
                </div>
                <div class="form-group">
                    <label>Bot Adı (Username)</label>
                    <input type="text" id="username" value="${botDurumu.kullaniciAdi}" required>
                </div>
                
                <div class="btn-group">
                    <button type="button" class="btn-start" onclick="botuBaslat()">🚀 Botu Sunucuya Sok</button>
                    <button type="button" class="btn-stop" onclick="botuDurdur()">🛑 Botu Geri Çek</button>
                </div>
            </form>

            <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 16px; color: #94a3b8;">📋 Canlı Konsol Logları</h3>
            <div class="logs-box" id="logsBox">
                <div>Yükleniyor...</div>
            </div>
        </div>

        <script>
            // Sitenin donmaması ve canlı kalması için her 3 saniyede bir verileri çeker
            async function verileriGuncelle() {
                try {
                    const res = await fetch('/api/status');
                    const data = await res.json();
                    
                    document.getElementById('statusText').innerText = data.durum;
                    const badge = document.getElementById('statusBadge');
                    const card = document.getElementById('statusCard');
                    
                    badge.innerText = data.durum;
                    card.style.borderLeftColor = data.renk;

                    const logsBox = document.getElementById('logsBox');
                    logsBox.innerHTML = data.loglar.map(l => \`<div class="log-line">\${l}</div>\`).join('');
                } catch(e) {}
            }

            async function botuBaslat() {
                const ip = document.getElementById('ip').value;
                const port = document.getElementById('port').value;
                const username = document.getElementById('username').value;

                await fetch('/api/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, port, username })
                });
                verileriGuncelle();
            }

            async function botuDurdur() {
                await fetch('/api/stop', { method: 'POST' });
                verileriGuncelle();
            }

            setInterval(verileriGuncelle, 3000);
            verileriGuncelle();
        </script>
    </body>
    </html>
    `);
});

// 🔄 CANLI SİTE/DURUM APİ'Sİ
app.get('/api/status', (req, res) => {
    res.json(botDurumu);
});

// 🚀 BOTU BAŞLATMA EMRİ
app.post('/api/start', (req, res) => {
    const { ip, port, username } = req.body;

    if (bot) {
        logEkle("⚠️ Bot zaten çalışıyor! Önce durdurun.");
        return res.json({ success: false });
    }

    botDurumu.ip = ip;
    botDurumu.port = parseInt(port);
    botDurumu.kullaniciAdi = username;
    botDurumu.durum = "Bağlanıyor...";
    botDurumu.renk = "#eab308";

    logEkle(`🔌 ${ip}:${port} adresine ${username} ismiyle bağlanılıyor...`);

    try {
        bot = mineflayer.createBot({
            host: botDurumu.ip,
            port: botDurumu.port,
            username: botDurumu.kullaniciAdi,
            version: "1.21.1",
            checkTimeoutInterval: 90000
        });

        bot.on('spawn', () => {
            botDurumu.durum = "🟢 Oyunda (Nöbet Aktif)";
            botDurumu.renk = "#22c55e";
            logEkle("✅ Bot BAŞARIYLA sunucuya girdi!");

            // 45 saniyede bir zıplama ve etrafa bakış
            if (!global.jumpInterval) {
                global.jumpInterval = setInterval(() => {
                    if (bot && bot.entity) {
                        bot.setControlState('jump', true);
                        setTimeout(() => bot.setControlState('jump', false), 500);
                        const yaw = Math.random() * Math.PI * 2;
                        bot.look(yaw, 0, false);
                    }
                }, 45000);
            }

            // 3 dakikada bir AFK engelleme komutu
            if (!global.helpInterval) {
                global.helpInterval = setInterval(() => {
                    if (bot && bot.player) {
                        bot.chat("/help");
                    }
                }, 180000);
            }
        });

        bot.on('kicked', (reason) => {
            logEkle(`⚠️ Sunucudan atıldı: ${JSON.stringify(reason)}`);
            botTemizle("🔴 Sunucudan Atıldı", "#ef4444");
        });

        bot.on('end', () => {
            logEkle("⚠️ Bağlantı koptu.");
            botTemizle("🔴 Çevrimdışı", "#ef4444");
        });

        bot.on('error', (err) => {
            logEkle(`❌ Bağlantı hatası: ${err.message}`);
            botTemizle("❌ Hata Oluştu", "#ef4444");
        });

        res.json({ success: true });
    } catch (err) {
        logEkle(`❌ Hata: ${err.message}`);
        botTemizle("❌ Hata Oluştu", "#ef4444");
        res.json({ success: false });
    }
});

// 🛑 BOTU GERİ ÇEKME / DURDURMA EMRİ
app.post('/api/stop', (req, res) => {
    if (bot) {
        logEkle("🛑 Kullanıcı emriyle bot oyundan çekiliyor...");
        bot.quit();
        botTemizle("🔴 Çevrimdışı (Durduruldu)", "#ef4444");
        res.json({ success: true });
    } else {
        logEkle("⚠️ Çalışan aktif bir bot bulunamadı.");
        res.json({ success: false });
    }
});

function botTemizle(durumMetni, renk) {
    if (bot) {
        bot.removeAllListeners();
        bot = null;
    }
    if (global.jumpInterval) clearInterval(global.jumpInterval);
    if (global.helpInterval) clearInterval(global.helpInterval);
    global.jumpInterval = null;
    global.helpInterval = null;

    botDurumu.durum = durumMetni;
    botDurumu.renk = renk;
}

// 🌐 Render Web Sunucusunu Başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logEkle(`🌐 Kontrol paneli yayında! Port: ${PORT}`);
});
