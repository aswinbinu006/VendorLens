import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface AlertEmailPayload {
  level: string;
  kind: string;
  message: string;
  vendorName?: string | null;
  dedupeKey: string;
  sourceUrl?: string | null;
  createdAt?: Date;
}

export const alertNotifier = {
  transporter: null as Transporter | null,

  getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    if (!env.SMTP_HOST || !env.ALERT_EMAIL_TO) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
    });

    return this.transporter;
  },

  async sendEmail(payload: AlertEmailPayload): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter || !env.ALERT_EMAIL_TO) {
      logger.info(
        { dedupeKey: payload.dedupeKey, level: payload.level, message: payload.message },
        'Email notification skipped: SMTP or ALERT_EMAIL_TO not configured',
      );
      return false;
    }

    if (env.NODE_ENV === 'test' && !process.env.TEST_LIVE_SMTP) {
      logger.info(
        { dedupeKey: payload.dedupeKey, level: payload.level, message: payload.message },
        'Email notification mocked in test environment',
      );
      return true;
    }

    try {
      const subject = `[VRM Alert - ${payload.level.toUpperCase()}] ${
        payload.vendorName ? `${payload.vendorName}: ` : ''
      }${payload.message}`;

      const text = `
Vendor Risk Monitor - Automated Compliance Alert
------------------------------------------------
Level: ${payload.level.toUpperCase()}
Kind: ${payload.kind}
Vendor: ${payload.vendorName ?? 'System-wide'}
Time: ${(payload.createdAt || new Date()).toISOString()}

Message:
${payload.message}

${payload.sourceUrl ? `Source Details: ${payload.sourceUrl}\n` : ''}
Dedupe Key: ${payload.dedupeKey}
------------------------------------------------
This is an automated security and compliance notification.
`.trim();

      const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <div style="background-color: ${payload.level === 'critical' ? '#e53e3e' : payload.level === 'high' ? '#dd6b20' : '#3182ce'}; color: white; padding: 12px 16px; border-radius: 6px; font-weight: bold; font-size: 16px;">
    [${payload.level.toUpperCase()}] VRM Compliance Alert
  </div>
  <div style="padding: 16px 0;">
    <h3 style="margin-top: 0; color: #2d3748;">${payload.vendorName ? payload.vendorName : 'System Event'}</h3>
    <p style="font-size: 15px; color: #4a5568; line-height: 1.5;">${payload.message}</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: #718096; width: 120px;">Alert Kind:</td>
        <td style="padding: 8px 0; font-weight: 500;">${payload.kind}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #718096;">Timestamp:</td>
        <td style="padding: 8px 0;">${(payload.createdAt || new Date()).toISOString()}</td>
      </tr>
      ${
        payload.sourceUrl
          ? `<tr><td style="padding: 8px 0; color: #718096;">Source:</td><td style="padding: 8px 0;"><a href="${payload.sourceUrl}" style="color: #3182ce;">View Details</a></td></tr>`
          : ''
      }
    </table>
  </div>
  <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #edf2f7; font-size: 12px; color: #a0aec0;">
    Ref: <code>${payload.dedupeKey}</code>
  </div>
</div>
`.trim();

      await transporter.sendMail({
        from: env.SMTP_USER || 'no-reply@vendor-risk-monitor.local',
        to: env.ALERT_EMAIL_TO,
        subject,
        text,
        html,
      });

      logger.info({ dedupeKey: payload.dedupeKey, to: env.ALERT_EMAIL_TO }, 'Alert email sent successfully');
      return true;
    } catch (err) {
      // Never crash alerting if email delivery fails (e.g. sandbox or network timeout)
      logger.error({ err, dedupeKey: payload.dedupeKey }, 'Failed to send alert email');
      return false;
    }
  },
};
