import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OutgoingEmail {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends transactional email through Brevo (https://www.brevo.com).
 * Free plan: 300 emails a day.
 *
 * Without BREVO_API_KEY (local development) emails are not sent: they are
 * written to the server log instead, so the flow can still be tested.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  get configured(): boolean {
    return !!this.config.get<string>('BREVO_API_KEY') && !!this.config.get<string>('EMAIL_FROM_ADDRESS');
  }

  /** Returns true when Brevo accepted the email. Never throws. */
  async send(mail: OutgoingEmail): Promise<boolean> {
    if (!this.configured) {
      this.logger.warn(`[email not configured] To: ${mail.to} | ${mail.subject}\n${mail.text}`);
      return false;
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.config.get<string>('BREVO_API_KEY')!,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: this.config.get<string>('EMAIL_FROM_ADDRESS'),
            name: this.config.get<string>('EMAIL_FROM_NAME') || 'Vita Care',
          },
          to: [{ email: mail.to, ...(mail.toName ? { name: mail.toName } : {}) }],
          subject: mail.subject,
          htmlContent: mail.html,
          textContent: mail.text,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.error(`Brevo rejected the email (${res.status}): ${(await res.text()).slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Could not reach Brevo: ${(err as Error).message}`);
      return false;
    }
  }
}

/** Escape text placed inside the HTML template. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function verificationEmail(name: string, link: string): { subject: string; html: string; text: string } {
  const subject = 'Confirm your email for Vita Care';
  const text =
    `Assalam-o-Alaikum ${name},\n\n` +
    `Please confirm your email to start using the Vita Care AI Doctor:\n${link}\n\n` +
    `This link works for 24 hours. If you did not create a Vita Care account, you can ignore this email.\n\n` +
    `In an emergency call 1122.\n— Vita Care`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f8fc;font-family:Arial,Helvetica,sans-serif;color:#1f2a44">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e8f2">
<tr><td style="background:#283779;padding:20px 24px;color:#ffffff;font-size:22px;font-weight:bold">Vita<span style="color:#7fe3f2">Care</span></td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:16px">Assalam-o-Alaikum ${esc(name)},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6">Please confirm your email to start using the Vita Care AI Doctor.</p>
<p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#283779;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:bold;font-size:15px">Confirm my email</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#6b7690">Or copy this link into your browser:</p>
<p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#1b71a1">${esc(link)}</p>
<p style="margin:0;font-size:13px;color:#6b7690">This link works for 24 hours. If you did not create a Vita Care account, ignore this email.</p>
</td></tr>
<tr><td style="padding:14px 24px;background:#fdecec;color:#a42020;font-size:13px">In an emergency call <b>1122</b>.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text };
}

export function resetCodeEmail(name: string, code: string): { subject: string; html: string; text: string } {
  const subject = `Your Vita Care password reset code: ${code}`;
  const text =
    `Assalam-o-Alaikum ${name},\n\nYour code to reset your Vita Care password is: ${code}\n\n` +
    `It works for 15 minutes. If you did not ask for this, ignore this email; your password stays the same.\n— Vita Care`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f8fc;font-family:Arial,Helvetica,sans-serif;color:#1f2a44">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e8f2">
<tr><td style="background:#283779;padding:20px 24px;color:#ffffff;font-size:22px;font-weight:bold">Vita<span style="color:#7fe3f2">Care</span></td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:16px">Assalam-o-Alaikum ${esc(name)},</p>
<p style="margin:0 0 16px;font-size:15px">Use this code to reset your password:</p>
<p style="margin:0 0 20px;font-size:32px;letter-spacing:8px;font-weight:bold;color:#283779">${esc(code)}</p>
<p style="margin:0;font-size:13px;color:#6b7690">It works for 15 minutes. If you did not ask for this, ignore this email; your password stays the same.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text };
}

export function contactNotificationEmail(m: { name: string; email: string; phone?: string | null; topic: string; message: string }) {
  const subject = `[Vita Care contact] ${m.topic} — ${m.name}`;
  const text = `New message from the Vita Care contact page\n\nName: ${m.name}\nEmail: ${m.email}\nPhone: ${m.phone || '-'}\nTopic: ${m.topic}\n\n${m.message}`;
  const html = `<pre style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap">${esc(text)}</pre>`;
  return { subject, html, text };
}
