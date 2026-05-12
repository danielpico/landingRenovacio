/**
 * lib/email.js
 * Email sending for landing form submissions.
 *
 * Priority:
 *   1. Resend      (RESEND_API_KEY)
 *   2. SendGrid    (SENDGRID_API_KEY)
 *   3. Console log (dev fallback)
 */

import { Resend } from 'resend';

const FROM   = process.env.EMAIL_FROM ?? 'noreply@smp.cat';
const TO     = process.env.EMAIL_TO   ?? 'info@smp.cat';
const FOOTER = 'Serveis Mèdics Penedès — Landing Renovació';

// ── Providers ─────────────────────────────────────────────────────────────────

async function sendViaResend({ subject, html, text }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to: TO, subject, html, text });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

async function sendViaSendGrid({ subject, html, text }) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: TO }] }],
      from:    { email: FROM },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html',  value: html },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SendGrid error ${res.status}: ${body}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   permit_type: string,
 *   permit_label: string,
 *   expiry_date: string,
 *   age: number,
 *   contact_mode: 'phone' | 'email',
 *   contact_value: string,
 *   wants_reminder: boolean,
 *   consent_marketing: boolean,
 *   lang: string,
 *   calculated_start: string,
 *   submitted_at: string,
 * }} data
 */
export async function sendFormSubmissionEmail(data) {
  const {
    permit_label, expiry_date, age,
    contact_mode, contact_value,
    wants_reminder, consent_marketing,
    lang, calculated_start, submitted_at,
  } = data;

  const urgency = (() => {
    const days = Math.round(
      (new Date(expiry_date + 'T12:00:00') - new Date()) / 86400000
    );
    if (days < 0)  return { label: 'CADUCAT',  color: '#991b1b', bg: '#fee2e2' };
    if (days <= 15) return { label: 'URGENT',   color: '#991b1b', bg: '#fee2e2' };
    if (days <= 60) return { label: 'AVIAT',    color: '#9a3412', bg: '#ffedd5' };
    return           { label: 'OK',           color: '#166534', bg: '#dcfce7' };
  })();

  const subject = `[Renovació] ${permit_label} — ${urgency.label} — ${expiry_date}`;

  const row = (label, value) => `
    <tr>
      <td style="padding:8px 16px 8px 0;font-weight:600;color:#555;white-space:nowrap;width:180px;vertical-align:top">${label}</td>
      <td style="padding:8px 0;color:#1e293b">${value}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:${urgency.bg};border-left:4px solid ${urgency.color};padding:12px 16px;border-radius:6px;margin-bottom:24px">
    <span style="font-weight:700;color:${urgency.color};font-size:1rem">${urgency.label}</span>
    <span style="color:${urgency.color};margin-left:8px">${permit_label}</span>
  </div>

  <h2 style="color:#1e293b;margin:0 0 16px;font-size:1.1rem">Nova sol·licitud de recordatori</h2>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    ${row('Reconeixement', permit_label)}
    ${row('Caducitat', expiry_date)}
    ${row('Inici recomanat', calculated_start)}
    ${row('Edat', age + ' anys')}
    ${row('Idioma', lang.toUpperCase())}
    ${row('Forma de contacte', contact_mode === 'phone' ? 'Telèfon' : 'Correu electrònic')}
    ${row('Contacte', contact_value || '—')}
    ${row('Vol recordatori', wants_reminder ? 'Sí' : 'No')}
    ${row('Consent. màrqueting', consent_marketing ? 'Sí' : 'No')}
    ${row('Data enviament', new Date(submitted_at).toLocaleString('ca-ES'))}
  </table>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px">
  <p style="font-size:0.78rem;color:#94a3b8">${FOOTER}</p>
</body>
</html>`;

  const text = [
    `[${urgency.label}] Nova sol·licitud de recordatori`,
    ``,
    `Reconeixement:       ${permit_label}`,
    `Caducitat:           ${expiry_date}`,
    `Inici recomanat:     ${calculated_start}`,
    `Edat:                ${age} anys`,
    `Idioma:              ${lang.toUpperCase()}`,
    `Forma de contacte:   ${contact_mode === 'phone' ? 'Telèfon' : 'Correu'}`,
    `Contacte:            ${contact_value || '—'}`,
    `Vol recordatori:     ${wants_reminder ? 'Sí' : 'No'}`,
    `Consent. màrqueting: ${consent_marketing ? 'Sí' : 'No'}`,
    `Data enviament:      ${new Date(submitted_at).toLocaleString('ca-ES')}`,
  ].join('\n');

  if (process.env.RESEND_API_KEY)   return sendViaResend({ subject, html, text });
  if (process.env.SENDGRID_API_KEY) return sendViaSendGrid({ subject, html, text });

  console.log('\n──────── FORM SUBMISSION (dev — no provider configured) ────────');
  console.log(text);
  console.log('────────────────────────────────────────────────────────────────\n');
}
