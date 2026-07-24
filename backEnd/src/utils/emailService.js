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
    const name = firstName?.trim() || 'User';
    const subject = 'EventSport — Your registration verification code';
    const text = `Hello ${name},\n\nYour EventSport registration verification code: ${otp}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, you can ignore this email.`;
    const html = `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Your EventSport registration verification code:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0891b2;">${otp}</p>
      <p style="font-size:12px;color:#666;">This code is valid for 10 minutes.</p>
    `;

    if (!isSmtpConfigured()) {
        console.log('\n--- Registration OTP (SMTP not configured) ---');
        console.log(`To: ${to}`);
        console.log(`Code: ${otp}\n`);
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
