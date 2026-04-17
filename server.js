const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const https = require('https');
const session = require('express-session');

// Try to load nodemailer (optional - only if email is configured)
let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (error) {
    // nodemailer is optional
}

const app = express();
const PORT = 3000;

/** Рядом с .exe (pkg) или с server.js — папка leads и опциональный config.js */
function getAppDataDir() {
    return typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : __dirname;
}

// Load email configuration
let emailConfig = null;
let transporter = null;

try {
    const configCandidates = [
        path.join(getAppDataDir(), 'config.js'),
        path.join(__dirname, 'config.js')
    ];
    for (const configPath of configCandidates) {
        if (fs.existsSync(configPath)) {
            emailConfig = require(configPath);
            break;
        }
    }

    // Create email transporter (only if nodemailer is available and email is configured)
    if (nodemailer && emailConfig && emailConfig.email) {
        transporter = nodemailer.createTransport({
            host: emailConfig.email.host,
            port: emailConfig.email.port,
            secure: emailConfig.email.secure,
            auth: emailConfig.email.auth
        });
        
        // Verify email connection
        transporter.verify(function(error, success) {
            if (error) {
                console.log('⚠️  Email configuration error:', error.message);
                console.log('📧 Email notifications will be disabled. Check config.js');
            } else {
                console.log('✅ Email server is ready to send notifications');
            }
        });
    }
} catch (error) {
    // config.js not found or email not configured - that's OK
    if (error.code !== 'MODULE_NOT_FOUND') {
        console.log('⚠️  config.js error:', error.message);
    }
}

// Session configuration
app.use(session({
    secret: 'liora-admin-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // project root or pkg snapshot

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }
}

// Create leads directory if it doesn't exist (writable: рядом с .exe при pkg)
const leadsDir = path.join(getAppDataDir(), 'leads');
if (!fs.existsSync(leadsDir)) {
    fs.mkdirSync(leadsDir);
}

// Route to handle form submission
app.post('/api/contact', (req, res) => {
    try {
        const { parentName, phone, childInfo, callTime, consent } = req.body;

        // Validation
        if (!parentName || !phone || !consent) {
            return res.status(400).json({
                success: false,
                message: 'Пожалуйста, заполните все обязательные поля'
            });
        }

        // Create lead object
        const lead = {
            timestamp: new Date().toISOString(),
            parentName: parentName.trim(),
            phone: phone.trim(),
            childInfo: childInfo ? childInfo.trim() : 'Не указано',
            callTime: callTime || 'anytime',
            consent: consent
        };

        // Save to single JSON file (array of all leads)
        const jsonPath = path.join(leadsDir, 'leads.json');
        let allLeads = [];
        
        // Read existing leads if file exists
        if (fs.existsSync(jsonPath)) {
            try {
                const existingData = fs.readFileSync(jsonPath, 'utf8');
                allLeads = JSON.parse(existingData);
            } catch (error) {
                console.error('Error reading leads.json:', error);
                allLeads = [];
            }
        }
        
        // Add new lead
        allLeads.push(lead);
        
        // Save all leads back to file
        fs.writeFileSync(jsonPath, JSON.stringify(allLeads, null, 2), 'utf8');

        // Also append to CSV file for easy viewing
        const csvLine = `${lead.timestamp},${lead.parentName},${lead.phone},${lead.childInfo},${lead.callTime}\n`;
        const csvPath = path.join(leadsDir, 'leads.csv');
        
        // Add header if file doesn't exist
        if (!fs.existsSync(csvPath)) {
            fs.writeFileSync(csvPath, 'Дата,Имя родителя,Телефон,Ребенок,Время звонка\n', 'utf8');
        }
        
        fs.appendFileSync(csvPath, csvLine, 'utf8');

        console.log(`✅ New lead received: ${parentName} - ${phone}`);

        // Send email notification to admin (if configured)
        if (transporter && emailConfig) {
            sendEmailNotification(lead).catch(err => {
                console.error('❌ Failed to send email notification:', err.message);
            });
        }
        
        // Send Telegram notification to admin (if configured)
        if (emailConfig && emailConfig.telegram) {
            sendTelegramNotification(lead).catch(err => {
                console.error('❌ Failed to send Telegram notification:', err.message);
            });
        }

        // Return success response
        res.json({
            success: true,
            message: 'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в течение 24 часов.'
        });

    } catch (error) {
        console.error('❌ Error processing form:', error);
        res.status(500).json({
            success: false,
            message: 'Произошла ошибка при обработке заявки. Пожалуйста, попробуйте позже.'
        });
    }
});

// Function to send email notification
async function sendEmailNotification(lead) {
    if (!transporter || !emailConfig) {
        return;
    }

    const callTimeText = {
        'anytime': 'Любое время',
        'morning': 'Утро',
        'day': 'День',
        'evening': 'Вечер'
    };

    const mailOptions = {
        from: `"${emailConfig.kindergartenName}" <${emailConfig.email.auth.user}>`,
        to: emailConfig.adminEmail,
        subject: `🔔 Новая заявка на продленку - ${lead.parentName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #2D8659; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
                    .info-row { margin: 15px 0; padding: 10px; background: white; border-left: 3px solid #2D8659; }
                    .label { font-weight: bold; color: #2D8659; }
                    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🔔 Новая заявка на продленку</h2>
                    </div>
                    <div class="content">
                        <p>Поступила новая заявка на услугу продленки в детском саду "${emailConfig.kindergartenName}".</p>
                        
                        <div class="info-row">
                            <span class="label">Имя родителя:</span> ${lead.parentName}
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Телефон:</span> <a href="tel:${lead.phone}">${lead.phone}</a>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Ребенок:</span> ${lead.childInfo}
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Удобное время для звонка:</span> ${callTimeText[lead.callTime] || lead.callTime}
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Дата и время заявки:</span> ${new Date(lead.timestamp).toLocaleString('ru-RU')}
                        </div>
                        
                        <div style="margin-top: 30px; padding: 15px; background: #E8F5E9; border-radius: 6px;">
                            <strong>💡 Действие:</strong> Пожалуйста, свяжитесь с родителем в удобное для него время.
                        </div>
                        
                        <div class="footer">
                            <p>Это автоматическое уведомление от системы сайта ${emailConfig.siteUrl}</p>
                            <p>Все заявки также сохраняются в файле leads/leads.csv</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Новая заявка на продленку

Имя родителя: ${lead.parentName}
Телефон: ${lead.phone}
Ребенок: ${lead.childInfo}
Удобное время для звонка: ${callTimeText[lead.callTime] || lead.callTime}
Дата и время: ${new Date(lead.timestamp).toLocaleString('ru-RU')}

Пожалуйста, свяжитесь с родителем в удобное для него время.
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email notification sent to ${emailConfig.adminEmail}`);
        return info;
    } catch (error) {
        console.error('❌ Email sending error:', error);
        throw error;
    }
}

// Function to send Telegram notification
async function sendTelegramNotification(lead) {
    if (!emailConfig || !emailConfig.telegram || !emailConfig.telegram.botToken || !emailConfig.telegram.chatId) {
        return;
    }

    const callTimeText = {
        'anytime': 'Любое время',
        'morning': 'Утро',
        'day': 'День',
        'evening': 'Вечер'
    };

    const message = `🔔 *Новая заявка на продленку*

👤 *Имя родителя:* ${lead.parentName}
📞 *Телефон:* ${lead.phone}
👶 *Ребенок:* ${lead.childInfo || 'Не указано'}
⏰ *Удобное время для звонка:* ${callTimeText[lead.callTime] || lead.callTime}
📅 *Дата и время:* ${new Date(lead.timestamp).toLocaleString('ru-RU')}

💡 Пожалуйста, свяжитесь с родителем в удобное для него время.`;

    const url = `https://api.telegram.org/bot${emailConfig.telegram.botToken}/sendMessage`;
    
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            chat_id: emailConfig.telegram.chatId,
            text: message,
            parse_mode: 'Markdown'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${emailConfig.telegram.botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.ok) {
                        console.log(`📱 Telegram notification sent to chat ${emailConfig.telegram.chatId}`);
                        resolve(result);
                    } else {
                        reject(new Error(result.description || 'Unknown error'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Telegram request error:', error);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Login route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true, message: 'Вход выполнен успешно' });
    } else {
        res.status(401).json({ success: false, message: 'Неверное имя пользователя или пароль' });
    }
});

// Logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка при выходе' });
        }
        res.json({ success: true, message: 'Выход выполнен успешно' });
    });
});

// Check authentication status
app.get('/api/auth-status', (req, res) => {
    res.json({ 
        authenticated: req.session && req.session.authenticated || false,
        username: req.session && req.session.username || null
    });
});

// Route to view leads (for testing/admin) - CSV format
app.get('/api/leads', requireAuth, (req, res) => {
    try {
        const csvPath = path.join(leadsDir, 'leads.csv');
        if (fs.existsSync(csvPath)) {
            const csvContent = fs.readFileSync(csvPath, 'utf8');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.send(csvContent);
        } else {
            res.json({ message: 'Пока нет заявок' });
        }
    } catch (error) {
        console.error('Error reading leads:', error);
        res.status(500).json({ error: 'Ошибка при чтении заявок' });
    }
});

// Route to get leads in JSON format (for admin panel)
app.get('/api/leads-json', requireAuth, (req, res) => {
    try {
        const jsonPath = path.join(leadsDir, 'leads.json');
        
        if (!fs.existsSync(jsonPath)) {
            return res.json([]);
        }
        
        const content = fs.readFileSync(jsonPath, 'utf8');
        const leads = JSON.parse(content);
        
        // Sort by timestamp (newest first)
        leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(leads);
    } catch (error) {
        console.error('Error reading leads JSON:', error);
        res.status(500).json({ error: 'Ошибка при чтении заявок' });
    }
});

// Protect admin.html - require authentication
app.get('/admin.html', (req, res, next) => {
    if (req.session && req.session.authenticated) {
        res.sendFile(path.join(__dirname, 'admin.html'));
    } else {
        res.redirect('/login.html');
    }
});

// Serve robots.txt and sitemap.xml
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Start server
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════');
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════════════');
    console.log(`📝 Form submissions will be saved to: ${leadsDir}`);
    console.log(`📊 View leads CSV: http://localhost:${PORT}/api/leads`);
    if (transporter && emailConfig) {
        console.log(`📧 Email notifications: ENABLED (${emailConfig.adminEmail})`);
    } else {
        console.log(`📧 Email notifications: DISABLED (configure config.js)`);
    }
    
    if (emailConfig && emailConfig.telegram && emailConfig.telegram.botToken) {
        console.log(`📱 Telegram notifications: ENABLED`);
    } else {
        console.log(`📱 Telegram notifications: DISABLED (configure config.js)`);
    }
    
    console.log(`🔐 Admin panel: http://localhost:${PORT}/admin.html`);
    console.log('═══════════════════════════════════════════════════');
    console.log('Press Ctrl+C to stop the server');
});

