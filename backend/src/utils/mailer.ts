import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.SMTP_USER || !env.SMTP_PASS || env.SMTP_PASS === 'YOUR_GMAIL_APP_PASSWORD_HERE') {
    console.warn('⚠️  SMTP not configured — emails will be logged to console only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransporter();

  // Always log for debugging
  console.log(`\n📧 EMAIL to ${to}:`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}\n`);

  if (!t) {
    console.log('   ⚠️  SMTP not configured — email NOT actually sent\n');
    return;
  }

  try {
    await t.sendMail({
      from: `"CONNECT ALUMNI" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('   ✅ Email sent successfully!\n');
  } catch (err) {
    console.error('   ❌ Failed to send email:', err);
  }
}

/**
 * Send OTP email for password reset
 */
export async function sendOtpEmail(to: string, otp: string, fullName: string) {
  const subject = 'CONNECT ALUMNI — Password Reset OTP';
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0c0f17; color: #e8ecf4; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 22px; margin: 0;">CONNECT ALUMNI</h1>
      </div>
      <h2 style="color: #e8ecf4; font-size: 18px; margin-bottom: 8px;">Password Reset Request</h2>
      <p style="color: #8896ae; font-size: 14px; line-height: 1.6;">Hi ${fullName},</p>
      <p style="color: #8896ae; font-size: 14px; line-height: 1.6;">You requested to reset your password. Use the OTP code below to verify your identity:</p>
      <div style="text-align: center; margin: 24px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, rgba(59,130,246,.15), rgba(139,92,246,.1)); border: 1px solid rgba(59,130,246,.3); border-radius: 12px; padding: 16px 32px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #3b82f6;">${otp}</span>
        </div>
      </div>
      <p style="color: #8896ae; font-size: 13px; line-height: 1.6;">This code expires in <strong style="color: #e8ecf4;">10 minutes</strong>. If you didn't request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,.07); margin: 24px 0;" />
      <p style="color: #5c6a82; font-size: 11px; text-align: center;">CONNECT ALUMNI — Alumni Networking Platform</p>
    </div>
  `;
  await sendEmail(to, subject, html);
}

/**
 * Send account status change email
 */
export async function sendAccountStatusEmail(
  to: string,
  fullName: string,
  status: 'SUSPENDED' | 'DELETED' | 'ACTIVE',
  reason?: string
) {
  const subjects: Record<string, string> = {
    SUSPENDED: 'CONNECT ALUMNI — Account Suspended',
    DELETED: 'CONNECT ALUMNI — Account Deleted',
    ACTIVE: 'CONNECT ALUMNI — Account Reactivated',
  };

  const messages: Record<string, string> = {
    SUSPENDED: `Your CONNECT ALUMNI account has been <strong style="color: #f59e0b;">suspended</strong> by an administrator.${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}<br><br>You will not be able to log in until your account is reactivated. To request reactivation, please contact the platform admin.`,
    DELETED: `Your CONNECT ALUMNI account has been <strong style="color: #ef4444;">permanently deleted</strong> by an administrator.${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}<br><br>If you believe this was a mistake, please contact the platform admin to request reinstatement.`,
    ACTIVE: `Great news! Your CONNECT ALUMNI account has been <strong style="color: #22c55e;">reactivated</strong>. You can now log in and use the platform again.`,
  };

  const icons: Record<string, string> = {
    SUSPENDED: '⚠️',
    DELETED: '🚫',
    ACTIVE: '🎉',
  };

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0c0f17; color: #e8ecf4; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 22px; margin: 0;">CONNECT ALUMNI</h1>
      </div>
      <div style="text-align: center; font-size: 36px; margin-bottom: 12px;">${icons[status]}</div>
      <h2 style="color: #e8ecf4; font-size: 18px; margin-bottom: 8px; text-align: center;">Account ${status === 'ACTIVE' ? 'Reactivated' : status === 'SUSPENDED' ? 'Suspended' : 'Deleted'}</h2>
      <p style="color: #8896ae; font-size: 14px; line-height: 1.6;">Hi ${fullName},</p>
      <p style="color: #8896ae; font-size: 14px; line-height: 1.6;">${messages[status]}</p>
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,.07); margin: 24px 0;" />
      <p style="color: #5c6a82; font-size: 11px; text-align: center;">CONNECT ALUMNI — Alumni Networking Platform</p>
    </div>
  `;

  await sendEmail(to, subjects[status], html);
}
