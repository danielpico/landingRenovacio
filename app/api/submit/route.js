import { NextResponse } from 'next/server';
import { sendFormSubmissionEmail } from '@/lib/email';
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
  } = body;

  if (!PERMIT_KEYS.includes(permit_type) || !expiry_date || !age) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const dict        = await getDictionary(lang);
  const permit_label = dict[`permit_${permit_type}`] || permit_type;

  try {
    await sendFormSubmissionEmail({
      permit_type,
      permit_label,
      expiry_date,
      age,
      contact_mode,
      contact_value,
      wants_reminder: Boolean(wants_reminder),
      consent_marketing: Boolean(consent_marketing),
      lang,
      calculated_start,
      submitted_at: submitted_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Email send failed:', err);
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
