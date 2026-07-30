import nodemailer from 'nodemailer';
import { AppError } from './appError.js';

export function isSmtpConfigured() {
    return Boolean(
        process.env.SMTP_HOST?.trim() &&
            process.env.SMTP_USER?.trim() &&
            process.env.SMTP_PASS?.trim()
    );
}

function createTransporter() {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

/**
 * Sends 6-digit registration OTP via SMTP.
 * Throws if SMTP is not configured or delivery fails.
 * Never returns the OTP to the client.
 */
export async function sendRegistrationOtpEmail({ to, firstName, otp }) {
    if (!isSmtpConfigured()) {
        throw new AppError(
            503,
            'Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
        );
    }

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

    try {
        const transporter = createTransporter();
        await transporter.sendMail({ from, to, subject, text, html });
        return { sent: true };
    } catch (err) {
        console.error('Registration OTP email failed:', err?.message || err);
        throw new AppError(
            502,
            'Could not send verification email. Please try again later.',
            err
        );
    }
}

/**
 * Sends 6-digit password reset OTP via SMTP.
 */
export async function sendPasswordResetOtpEmail({ to, firstName, otp }) {
    if (!isSmtpConfigured()) {
        throw new AppError(
            503,
            'Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
        );
    }

    const from =
        process.env.SMTP_FROM || process.env.SMTP_USER || 'EventSport <noreply@eventsport.local>';
    const name = firstName?.trim() || 'User';
    const subject = 'EventSport — Your password reset code';
    const text = `Hello ${name},\n\nYour EventSport password reset code: ${otp}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, you can ignore this email.`;
    const html = `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Your EventSport password reset code:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0891b2;">${otp}</p>
      <p style="font-size:12px;color:#666;">This code is valid for 10 minutes.</p>
      <p style="font-size:12px;color:#666;">If you did not request a password reset, you can ignore this email.</p>
    `;

    try {
        const transporter = createTransporter();
        await transporter.sendMail({ from, to, subject, text, html });
        return { sent: true };
    } catch (err) {
        console.error('Password reset OTP email failed:', err?.message || err);
        throw new AppError(
            502,
            'Could not send verification email. Please try again later.',
            err
        );
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
