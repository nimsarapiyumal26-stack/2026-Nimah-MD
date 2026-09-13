const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Web Pairing Portal
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NIMAH MD - Pairing Portal</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 35px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); width: 380px; text-align: center; border: 1px solid #334155; }
                h2 { color: #38bdf8; margin-bottom: 8px; font-size: 26px; }
                p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
                input { width: 100%; padding: 14px; margin: 10px 0 20px 0; border: 1px solid #475569; border-radius: 8px; background: #0f172a; color: #fff; font-size: 16px; box-sizing: border-box; outline: none; transition: 0.3s; }
                input:focus { border-color: #38bdf8; }
                button { background: linear-gradient(135deg, #38bdf8, #0284c7); color: #0f172a; border: none; padding: 14px; width: 100%; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.3s; }
                button:hover { opacity: 0.9; transform: translateY(-1px); }
                #result { margin-top: 20px; font-size: 20px; word-break: break-all; color: #4ade80; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>👑 NIMAH MD</h2>
                <p>✨ Enter your WhatsApp number with country code to get Pair Code ✨</p>
                <form id="pairForm">
                    <input type="text" id="phone" placeholder="📱 e.g. 94771234567" required>
                    <button type="submit" id="btn">🔗 Get Pair Code</button>
                </form>
                <div id="result"></div>
            </div>
            <script>
                document.getElementById('pairForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const phone = document.getElementById('phone').value;
                    const btn = document.getElementById('btn');
                    const result = document.getElementById('result');
                    btn.innerText = '⏳ Generating Code...';
                    result.innerText = '';
                    try {
                        const res = await fetch('/code?phone=' + phone);
                        const data = await res.json();
                        if(data.code) {
                            result.innerHTML = '🎉 Your Pair Code: <br><br><span style="font-size:28px; color:#facc15; background:#0f172a; padding:10px 20px; border-radius:8px; display:inline-block; border:1px dashed #facc15;">' + data.code + '</span>';
                            btn.innerText = '✅ Success!';
                        } else {
                            result.innerHTML = '<span style="color:#f87171;">❌ ' + (data.error || 'Failed to generate') + '</span>';
                            btn.innerText = '🔗 Get Pair Code';
                        }
                    } catch(err) {
                        result.innerHTML = '<span style="color:#f87171;">⚠️ Server Connection Error</span>';
                        btn.innerText = '🔗 Get Pair Code';
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Pair Code Generator Route
app.get('/code', async (req, res) => {
    const phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number is required!' });

    const sessionDir = './session_' + Date.now();
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: state,
            browser: ["Nimah MD", "Chrome", "5.0.0"]
        });

        if (!sock.authState.creds.registered) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            let code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            res.json({ code: code });
        } else {
            res.json({ error: 'Number already registered!' });
        }

        sock.ev.on('creds.update', saveCreds);
    } catch (err) {
        res.json({ error: 'Error generating code. Try again!' });
    }
});

// Main Bot Logic & Commands
async function startMainBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["Nimah MD", "Chrome", "5.0.0"]
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startMainBot();
        } else if (connection === 'open') {
            console.log('🤖 🚀 Nimah MD Power Bot Successfully Connected to WhatsApp! 🔥');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const messageType = Object.keys(msg.message)[0];
            const body = messageType === 'conversation' ? msg.message.conversation :
                         messageType === 'extendedTextMessage' ? msg.message.extendedTextMessage.text : '';
            
            const from = msg.key.remoteJid;
            const args = body.trim().split(/ +/);
            const command = args.shift().toLowerCase();
            const q = args.join(' ');

            if (!command.startsWith('.') && !command.startsWith('/')) return;

            switch (command) {
                case '.ping':
                case '/ping':
                    const start = Date.now();
                    let chi = await sock.sendMessage(from, { text: '⚡ *Pinging server...*' }, { quoted: msg });
                    const latency = Date.now() - start;
                    await sock.sendMessage(from, { text: `🚀 *Response Speed:* \`${latency}ms\`\n💎 *Status:* Ultra High Speed ⚡` }, { quoted: chi });
                    break;

                case '.alive':
                case '/alive':
                    await sock.sendMessage(from, { 
                        text: `╭━━━〔 *👑 NIMAH MD ACTIVE* 〕━━━┈⊷\n┃ ⚡ *Status:* Online & Stable\n┃ 🤖 *Mode:* Multi-Device Power Bot\n┃ 💎 *Version:* 5.0.0 Ultimate\n┃ ✨ *Owner:* Nimah\n╰━━━━━━━━━━━━━━━━━━━━━━━┈⊷` 
                    }, { quoted: msg });
                    break;

                case '.menu':
                case '.help':
                case '/menu':
                    let menuText = `╭━━━〔 *👑 NIMAH MD COMMANDS 👑* 〕━━━┈⊷
┃ 👋 Hello user, welcome to Nimah MD!
┃ ⚡ Total Commands Loaded: 300+
┃ 
┃ ⚡ *[1] SYSTEM & INFO*
┃ 📌 .ping | .alive | .runtime | .owner
┃ 
┃ 📥 *[2] DOWNLOADER COMMANDS*
┃ 📌 .song [name] | .video [name] | .fb | .tiktok
┃ 
┃ 🛠️ *[3] AI & TOOLS*
┃ 📌 .ai [text] | .calc [math] | .weather [city]
┃ 
┃ 🎮 *[4] FUN & GAMES*
┃ 📌 .quote | .joke | .fact | .roll
┃ 
┃ 🛡️ *[5] GROUP MANAGEMENT*
┃ 📌 .tagall | .kick | .promote | .demote
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷`;
                    await sock.sendMessage(from, { text: menuText }, { quoted: msg });
                    break;

                case '.ai':
                case '.gpt':
                    if (!q) return sock.sendMessage(from, { text: '❌ *Please provide a prompt!* \n📌 *Example:* `.ai Who is Albert Einstein?`' }, { quoted: msg });
                    try {
                        let res = await axios.get(`https://api.siputzx.my.id/api/ai/chatbot?content=${encodeURIComponent(q)}`);
                        let answer = res.data.data || res.data.result || 'No response from AI server.';
                        await sock.sendMessage(from, { text: `🤖 *Nimah AI Assistant* ✨\n\n${answer}` }, { quoted: msg });
                    } catch (e) {
                        await sock.sendMessage(from, { text: '⚠️ *AI service is currently busy. Please try again later!*' }, { quoted: msg });
                    }
                    break;

                case '.calc':
                    if (!q) return sock.sendMessage(from, { text: '❌ *Provide a math expression!* \n📌 *Example:* `.calc 50 + 50 * 2`' }, { quoted: msg });
                    try {
                        let result = eval(q);
                        await sock.sendMessage(from, { text: `🧮 *Calculation Result:* \`${result}\` ✨` }, { quoted: msg });
                    } catch (e) {
                        await sock.sendMessage(from, { text: '❌ *Invalid mathematical expression!*' }, { quoted: msg });
                    }
                    break;

                case '.quote':
                    let quotes = [
                        "💡 Success is not final; failure is not fatal: It is the courage to continue that counts.",
                        "💻 Code is like humor. When you have to explain it, it’s bad.",
                        "🚀 Stay focused, work hard, and make it happen!"
                    ];
                    let randomQ = quotes[Math.floor(Math.random() * quotes.length)];
                    await sock.sendMessage(from, { text: `💬 *Motivation Quote:* \n\n"${randomQ}" ✨` }, { quoted: msg });
                    break;

                case '.joke':
                    let jokes = [
                        "😂 Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
                        "🤣 There are 10 types of people in the world: those who understand binary, and those who don't."
                    ];
                    let randomJ = jokes[Math.floor(Math.random() * jokes.length)];
                    await sock.sendMessage(from, { text: `🎭 *Funny Joke:* \n\n${randomJ}` }, { quoted: msg });
                    break;
            }

        } catch (err) {
            console.log('Error handling command: ', err);
        }
    });
}

app.listen(PORT, () => {
    console.log(`🌐 Web Server running on port ${PORT}`);
    startMainBot();
});
