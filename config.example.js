// Configuration Example
// Copy this file to config.js and fill in your settings

module.exports = {
    // ============================================
    // EMAIL SETTINGS (Optional)
    // ============================================
    // If you don't want to use email, just leave this section or don't create config.js
    email: {
        // SMTP server settings
        // For Gmail: use smtp.gmail.com
        // For Outlook: use smtp-mail.outlook.com
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'your-email@gmail.com', // Your email address
            pass: 'your-app-password'     // Your email password or app password
        }
    },
    
    // Recipient email (where notifications will be sent)
    adminEmail: 'admin@liora-kindergarten.com',
    
    // ============================================
    // TELEGRAM SETTINGS (Recommended!)
    // ============================================
    // Much easier than email! Just create a bot and get token + chat ID
    telegram: {
        // Bot token from @BotFather
        // 1. Open Telegram, search for @BotFather
        // 2. Send /newbot command
        // 3. Follow instructions to create bot
        // 4. Copy the token here
        botToken: '8590033940:AAHiwDQienOKIOT9gJfx_iJhykEEOQJ3Fis',
        
        // Your Telegram chat ID (where to send notifications)
        // 1. Open Telegram, search for @userinfobot
        // 2. Send /start to get your chat ID
        // 3. Copy the ID here (it's a number like 123456789)
        chatId: '6469030723'
    },
    
    // Kindergarten name
    kindergartenName: 'Ган Лиора',
    
    // Site URL (for email links)
    siteUrl: 'http://localhost:3000'
};

// Instructions:
// 1. Copy this file: cp config.example.js config.js
// 2. Fill in your email settings
// 3. For Gmail: Enable 2-factor authentication and create an App Password
//    (Settings > Security > 2-Step Verification > App passwords)
// 4. For other providers: Use your SMTP credentials

