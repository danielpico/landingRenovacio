import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function saveSubmission({
  landing_url,
  permit_type,
  expiry_date,
  age,
  contact_mode,
  contact_value,
  wants_reminder,
  consent_marketing,
  lang,
  calculated_start,
  submitted_at,
}) {
  await sql`
    INSERT INTO form_submissions (
      landing_url, permit_type, expiry_date, age,
      contact_mode, contact_value, wants_reminder,
      consent_privacy, consent_marketing,
      lang, calculated_start, submitted_at
    ) VALUES (
      ${landing_url}, ${permit_type}, ${expiry_date}, ${age},
      ${contact_mode || null}, ${contact_value || null}, ${wants_reminder},
      TRUE, ${consent_marketing},
      ${lang}, ${calculated_start || null}, ${submitted_at}
    )
  `;
}
