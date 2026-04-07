const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

// Store the latest QR code data URL so we can serve it as an image
let latestQR = null;
let isReady = false;

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(), // Saves your login session so you don't scan the QR code every time
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
            // NOTE: --single-process removed — it causes Chrome to crash and disconnect
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('New QR code received. Visit /qr to scan it.');
    // Convert to a data URL image so it can be displayed in the browser
    latestQR = await QRCode.toDataURL(qr);
    isReady = false;
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot is Ready and Connected!');
    latestQR = null;
    isReady = true;
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp disconnected:', reason);
    isReady = false;
});

client.initialize();

// ─── Routes ──────────────────────────────────────────────────────────────────

// Homepage: show status
app.get('/', (req, res) => {
    if (isReady) {
        res.send('<h2 style="color:green;font-family:sans-serif">✅ WhatsApp Bot is Connected and Ready!</h2>');
    } else if (latestQR) {
        res.send('<h2 style="font-family:sans-serif">⏳ Waiting for QR scan... <a href="/qr">Click here to scan QR</a></h2>');
    } else {
        res.send('<h2 style="font-family:sans-serif">⏳ Initializing WhatsApp... Please wait and refresh.</h2>');
    }
});

// QR page: display scannable QR code image
app.get('/qr', (req, res) => {
    if (isReady) {
        return res.send('<h2 style="color:green;font-family:sans-serif">✅ Already connected! No QR needed.</h2>');
    }
    if (!latestQR) {
        return res.send('<h2 style="font-family:sans-serif">⏳ QR not ready yet. Refresh in 10 seconds...</h2><script>setTimeout(()=>location.reload(),5000)</script>');
    }
    // Display a proper scannable QR image
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Scan WhatsApp QR</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 40px; background: #f0f0f0; }
                img { border: 8px solid white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
                p { color: #555; }
            </style>
            <meta http-equiv="refresh" content="30">
        </head>
        <body>
            <h2>📱 Scan this QR Code with WhatsApp</h2>
            <p>Open WhatsApp → Linked Devices → Link a Device → Scan below</p>
            <img src="${latestQR}" width="300" height="300" />
            <p><small>Page auto-refreshes every 30s. QR codes expire after ~60 seconds.</small></p>
        </body>
        </html>
    `);
});

// Send WhatsApp message endpoint
app.post('/send-whatsapp', async (req, res) => {
    // Guard: don't attempt to send if the client isn't fully ready yet
    if (!isReady) {
        console.warn('WhatsApp client not ready. Message not sent.');
        return res.status(503).json({ success: false, error: 'WhatsApp client not ready. Please scan the QR code at /qr first.' });
    }

    try {
        const { phoneNumber, orderId, totalAmount } = req.body;
        
        // WhatsApp requires the country code (e.g., 91 for India) and the @c.us suffix
        const formattedNumber = `91${phoneNumber}@c.us`; 
        
        const message = `*Order Confirmed!* 🍔\n\nYour order #${orderId} for ₹${totalAmount} has been received by JK Restaurant and is being prepared. We will update you shortly!`;

        await client.sendMessage(formattedNumber, message);
        console.log(`✅ WhatsApp message sent to ${phoneNumber} for order ${orderId}`);
        res.status(200).json({ success: true, message: 'WhatsApp sent!' });

    } catch (error) {
        console.error('Failed to send WhatsApp:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp microservice running on port ${PORT}`);
    console.log(`📱 Visit /qr on your Render URL to scan the QR code`);
});
