const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

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
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('SCAN THIS QR CODE WITH THE RESTAURANT WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot is Ready and Connected!');
});

client.initialize();

// The API endpoint your Vercel app will call
app.post('/send-whatsapp', async (req, res) => {
    try {
        const { phoneNumber, orderId, totalAmount } = req.body;
        
        // WhatsApp requires the country code (e.g., 91 for India) and the @c.us suffix
        const formattedNumber = `91${phoneNumber}@c.us`; 
        
        const message = `*Order Confirmed!* 🍔\n\nYour order #${orderId} for ₹${totalAmount} has been received by JK Restaurant and is being prepared. We will update you shortly!`;

        await client.sendMessage(formattedNumber, message);
        res.status(200).json({ success: true, message: 'WhatsApp sent!' });

    } catch (error) {
        console.error('Failed to send WhatsApp:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp microservice running on port ${PORT}`);
});
