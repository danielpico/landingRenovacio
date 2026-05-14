import { NextResponse } from 'next/server';
import { sendFormSubmissionEmail } from '@/lib/email';
import { saveSubmission } from '@/lib/db';
import { PERMIT_KEYS } from '@/lib/permitConfig';
import { getDictionary } from '@/lib/getDictionary';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    permit_type, expiry_date, age,
    contact_mode, contact_value,
    wants_reminder, consent_marketing,
    lang = 'ca', calculated_start, submitted_at,
    landing_url,
  } = body;

  if (!PERMIT_KEYS.includes(permit_type) || !expiry_date || !age) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const dict         = await getDictionary(lang);
  const permit_label = dict[`permit_${permit_type}`] || permit_type;
  const resolvedUrl  = landing_url || process.env.NEXT_PUBLIC_APP_URL || 'unknown';
  const resolvedAt   = submitted_at || new Date().toISOString();

  try {
    await Promise.all([
      sendFormSubmissionEmail({
        permit_type,
        permit_label,
        expiry_date,
        age,
        contact_mode,
        contact_value,
        wants_reminder:    Boolean(wants_reminder),
        consent_marketing: Boolean(consent_marketing),
        lang,
        calculated_start,
        submitted_at: resolvedAt,
      }),
      saveSubmission({
        landing_url:       resolvedUrl,
        permit_type,
        expiry_date,
        age,
        contact_mode,
        contact_value,
        wants_reminder:    Boolean(wants_reminder),
        consent_marketing: Boolean(consent_marketing),
        lang,
        calculated_start,
        submitted_at:      resolvedAt,
      }),
    ]);
  } catch (err) {
    console.error('Submission failed:', err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
