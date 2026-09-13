const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Web Pairing Portal - Pro Design matching Logo Theme & SL Number Formats (No AI icon)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NIMAH MD - Pairing Portal</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #050508; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #121826; padding: 35px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.7); width: 390px; text-align: center; border: 1px solid #1e293b; position: relative; overflow: hidden; }
                .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc); }
                .logo-container { margin-bottom: 15px; display: inline-block; padding: 3px; border-radius: 50%; box-shadow: 0 0 20px rgba(56, 189, 248, 0.3); }
                .logo-img { width: 85px; height: 85px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8; display: block; }
                h2 { color: #f8fafc; margin-bottom: 5px; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
                .subtitle { color: #94a3b8; font-size: 13px; margin-bottom: 25px; line-height: 1.4; }
                .input-group { position: relative; margin-bottom: 20px; text-align: left; }
                label { font-size: 12px; color: #38bdf8; font-weight: 600; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
                input { width: 100%; padding: 14px 14px 14px 45px; border: 1px solid #334155; border-radius: 10px; background: #0b0f19; color: #fff; font-size: 16px; box-sizing: border-box; outline: none; transition: 0.3s; }
                input:focus { border-color: #38bdf8; box-shadow: 0 0 10px rgba(56,189,248,0.2); }
                .phone-icon { position: absolute; left: 14px; top: 37px; font-size: 18px; }
                .hint { font-size: 11px; color: #64748b; margin-top: -15px; margin-bottom: 20px; text-align: left; }
                button { background: linear-gradient(135deg, #38bdf8, #0284c7); color: #0f172a; border: none; padding: 14px; width: 100%; border-radius: 10px; font-weight: 700; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 12px rgba(2,132,199,0.3); }
                button:hover { opacity: 0.95; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(2,132,199,0.4); }
                #result { margin-top: 20px; font-size: 18px; word-break: break-all; font-weight: bold; }
                .operator-tags { display: flex; justify-content: center; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
                .tag { background: #1e293b; color: #38bdf8; font-size: 10px; padding: 3px 8px; border-radius: 4px; border: 1px solid #334155; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo-container">
                    <img src="https://i.ibb.co/Xx3HSfps/file-00000000446c81faa6d8e84332e88889.png" alt="Nimah MD Logo" class="logo-img">
                </div>
                <h2>NIMAH MD</h2>
                <div class="subtitle">Secure Multi-Device WhatsApp Pairing System</div>
                
                <div class="operator-tags">
                    <span class="tag">077</span>
                    <span class="tag">071</span>
                    <span class="tag">075</span>
                    <span class="tag">078</span>
                    <span class="tag">076</span>
                    <span class="tag">074</span>
                    <span class="tag">070</span>
                </div>

                <form id="pairForm">
                    <div class="input-group">
                        <label for="phone">WhatsApp Number</label>
                        <span class="phone-icon">📞</span>
                        <input type="text" id="phone" placeholder="94771234567" required>
                    </div>
                    <div class="hint">Format: Country code + Number (e.g., 94771234567)</div>
                    <button type="submit" id="btn">Generate Pair Code</button>
                </form>
                <div id="result"></div>
            </div>
            <script>
                document.getElementById('pairForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    let phone = document.getElementById('phone').value.trim();
                    const btn = document.getElementById('btn');
                    const result = document.getElementById('result');

                    // Auto-fix if user types leading 0 after 94 (e.g. 9407...)
                    phone = phone.replace(/^940/, '94');

                    btn.innerText = 'Generating Code...';
                    btn.disabled = true;
                    result.innerText = '';
                    
                    try {
                        const res = await fetch('/code?phone=' + encodeURIComponent(phone));
                        const data = await res.json();
                        if(data.code) {
                            result.innerHTML = 'Your Pair Code: <br><br><span style="font-size:26px; color:#facc15; background:#0b0f19; padding:12px 18px; border-radius:10px; display:inline-block; border:1px dashed #facc15; letter-spacing:2px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);">' + data.code + '</span>';
                            btn.innerText = 'Code Generated Successfully!';
                        } else {
                            result.innerHTML = '<span style="color:#f87171; font-size:14px;">' + (data.error || 'Failed to generate') + '</span>';
                            btn.innerText = 'Generate Pair Code';
                            btn.disabled = false;
                        }
                    } catch(err) {
                        result.innerHTML = '<span style="color:#f87171; font-size:14px;">Network Connection Error</span>';
                        btn.innerText = 'Generate Pair Code';
                        btn.disabled = false;
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Pair Code Generator Route with Strict Error Handling & Session Fix
app.get('/code', async (req, res) => {
    let phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number is required!' });

    // Sanitize to digits only
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    // Validation check for Sri Lankan numbers starting with 94
    if (phoneNumber.startsWith('94')) {
        const after94 = phoneNumber.slice(2);
        if (after94.startsWith('0')) {
            phoneNumber = '94' + after94.slice(1);
        }
    }

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

        sock.ev.on('creds.update', saveCreds);

        // Fixed connection block to prevent unhandled pairing crashes and error loops
        if (!sock.authState.creds.registered) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                return res.json({ code: code });
            } catch (pairingErr) {
                console.error("Pairing Error:", pairingErr);
                return res.json({ error: 'Failed to request code. Try again!' });
            }
        } else {
            return res.json({ error: 'Number already registered!' });
        }

    } catch (err) {
        console.error("Session Error:", err);
        return res.json({ error: 'Error generating code. Try again!' });
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
            console.log('Nimah MD Power Bot Successfully Connected to WhatsApp!');
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
                    let chi = await sock.sendMessage(from, { text: 'Pinging server...' }, { quoted: msg });
                    const latency = Date.now() - start;
                    await sock.sendMessage(from, { text: `Response Speed: ${latency}ms\nStatus: Ultra High Speed` }, { quoted: chi });
                    break;

                case '.alive':
                case '/alive':
                    await sock.sendMessage(from, { 
                        text: `NIMAH MD ACTIVE\nStatus: Online & Stable\nMode: Multi-Device Power Bot\nVersion: 5.0.0 Ultimate\nOwner: Nimah` 
                    }, { quoted: msg });
                    break;

                case '.menu':
                case '.help':
                case '/menu':
                    let menuText = `NIMAH MD COMMANDS\nHello user, welcome to Nimah MD!\nTotal Commands Loaded: 300+\n\n[1] SYSTEM & INFO\n.ping | .alive | .runtime | .owner\n\n[2] DOWNLOADER\n.song | .video | .fb | .tiktok\n\n[3] TOOLS\n.ai | .calc | .weather\n\n[4] FUN\n.quote | .joke`;
                    await sock.sendMessage(from, { text: menuText }, { quoted: msg });
                    break;

                case '.ai':
                case '.gpt':
                    if (!q) return sock.sendMessage(from, { text: 'Please provide a prompt! Example: .ai Who is Albert Einstein?' }, { quoted: msg });
                    try {
                        let res = await axios.get(`https://api.siputzx.my.id/api/ai/chatbot?content=${encodeURIComponent(q)}`);
                        let answer = res.data.data || res.data.result || 'No response from AI server.';
                        await sock.sendMessage(from, { text: `Nimah AI Assistant\n\n${answer}` }, { quoted: msg });
                    } catch (e) {
                        await sock.sendMessage(from, { text: 'AI service is currently busy. Please try again later!' }, { quoted: msg });
                    }
                    break;

                case '.calc':
                    if (!q) return sock.sendMessage(from, { text: 'Provide a math expression! Example: .calc 50 + 50 * 2' }, { quoted: msg });
                    try {
                        let result = eval(q);
                        await sock.sendMessage(from, { text: `Calculation Result: ${result}` }, { quoted: msg });
                    } catch (e) {
                        await sock.sendMessage(from, { text: 'Invalid mathematical expression!' }, { quoted: msg });
                    }
                    break;
            }
        } catch (err) {
            console.log('Error handling command: ', err);
        }
    });
}

app.listen(PORT, () => {
    console.log(`Web Server running on port ${PORT}`);
    startMainBot();
});
