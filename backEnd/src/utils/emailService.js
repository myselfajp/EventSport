import nodemailer from 'nodemailer';

function isSmtpConfigured() {
    return Boolean(process.env.SMTP_HOST?.trim());
}

function createTransporter() {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const options = {
        host: process.env.SMTP_HOST,
        port,
        secure,
    };
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        options.auth = {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        };
    }
    return nodemailer.createTransport(options);
}

/**
 * Sends 6-digit registration OTP. Requires SMTP_HOST (and usually USER/PASS).
 */
export async function sendRegistrationOtpEmail({ to, firstName, otp }) {
    const from =
        process.env.SMTP_FROM || process.env.SMTP_USER || 'EventSport <noreply@eventsport.local>';
    const name = firstName?.trim() || 'Kullanıcı';
    const subject = 'EventSport — Kayıt doğrulama kodunuz';
    const text = `Merhaba ${name},\n\nEventSport kayıt doğrulama kodunuz: ${otp}\n\nBu kod 10 dakika geçerlidir.\n\nBu işlemi siz yapmadıysanız bu e-postayı yok sayın.`;
    const html = `
      <p>Merhaba <strong>${escapeHtml(name)}</strong>,</p>
      <p>EventSport kayıt doğrulama kodunuz:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0891b2;">${otp}</p>
      <p style="font-size:12px;color:#666;">Kod 10 dakika geçerlidir.</p>
    `;

    if (!isSmtpConfigured()) {
        console.log('\n--- Kayıt OTP (SMTP ayarlı değil) ---');
        console.log(`Alıcı: ${to}`);
        console.log(`Kod: ${otp}\n`);
        return { sent: false };
    }

    const transporter = createTransporter();
    await transporter.sendMail({ from, to, subject, text, html });
    return { sent: true };
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
