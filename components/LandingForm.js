'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PERMIT_KEYS, LEAD_DAYS, LEAD_DAYS_SENIOR } from '@/lib/permitConfig';

const LANGS = ['ca', 'es', 'en', 'fr'];
const LANDING_URL = 'https://landing-carne.vercel.app/';
const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT || '';

const LOCALE_MAP = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB', fr: 'fr-FR' };

function formatDate(dateStr, lang) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(LOCALE_MAP[lang] || 'ca-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysDiff(from, to) {
  return Math.round(
    (new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 86400000
  );
}

export default function LandingForm({ dict, lang }) {
  const router = useRouter();

  const [step, setStep]               = useState(1);
  const [permitType, setPermitType]   = useState('');
  const [expiryDate, setExpiryDate]   = useState('');
  const [userAge, setUserAge]         = useState('');
  const [contactMode, setContactMode] = useState('phone');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [checks, setChecks]           = useState({ reminder: false, privacy: false, marketing: false });
  const [errors, setErrors]           = useState({});
  const [result, setResult]           = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function switchLang(l) {
    document.cookie = `LOCALE=${l}; path=/; max-age=31536000; samesite=lax`;
    router.push(`/${l}`);
  }

  function toggleCheck(id) {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }));
    if (id === 'privacy') setErrors(prev => ({ ...prev, privacy: false }));
  }

  function goStep1() {
    setStep(1);
    setErrors({});
    setSubmitError(false);
  }

  function goStep2() {
    const age = parseInt(userAge);
    const errs = {};
    if (!permitType) errs.permit = true;
    if (!expiryDate) errs.expiry = true;
    if (!userAge || age < 14 || age > 100) errs.age = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  }

  async function calculate() {
    const contactVal = contactMode === 'phone' ? contactPhone.trim() : contactEmail.trim();
    const errs = {};
    if (checks.reminder && !contactVal) errs.contact = true;
    if (!checks.privacy) errs.privacy = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const age       = parseInt(userAge);
    const today     = new Date().toISOString().split('T')[0];
    const isSenior  = age >= 65;
    const lead      = (isSenior && LEAD_DAYS_SENIOR[permitType]) || LEAD_DAYS[permitType] || 45;
    const startDate = addDays(expiryDate, -lead);
    const daysLeft  = daysDiff(today, expiryDate);
    const daysToStart = daysDiff(today, startDate);

    const permitLabel = dict[`permit_${permitType}`] || permitType;

    function fill(str) {
      return str
        .replace('{permit}', permitLabel)
        .replace('{days}',   daysLeft)
        .replace('{expiry}', formatDate(expiryDate, lang))
        .replace('{start}',  formatDate(startDate, lang));
    }

    let state, icon, titleKey, bodyKey;
    if (daysLeft < 0) {
      state = 'urgent'; icon = '🚨'; titleKey = 'r_expired_title'; bodyKey = 'r_expired_body';
    } else if (daysLeft <= 15) {
      state = 'urgent'; icon = '🚨'; titleKey = 'r_urgent_title'; bodyKey = 'r_urgent_body';
    } else if (daysToStart <= 0) {
      state = 'soon';   icon = '⚠️'; titleKey = 'r_soon_title';   bodyKey = 'r_soon_body';
    } else if (daysLeft <= lead * 2) {
      state = 'planned'; icon = '📅'; titleKey = 'r_planned_title'; bodyKey = 'r_planned_body';
    } else {
      state = 'ok';     icon = '✅'; titleKey = 'r_ok_title';     bodyKey = 'r_ok_body';
    }

    const daysDisplay = daysLeft < 0
      ? { text: (dict.r_expired_title || 'Caducat').replace('!', ''), color: 'var(--error-text)' }
      : {
          text: dict.days_label.replace('{n}', daysLeft),
          color: daysLeft < 30 ? 'var(--error-text)' : daysLeft < lead ? 'var(--orange-text)' : 'var(--success-text)',
        };

    const reminderText = (checks.reminder && contactVal)
      ? dict.reminder_set.replace('{contact}', contactVal).replace('{start}', formatDate(startDate, lang))
      : null;

    if (FORM_ENDPOINT) {
      setSubmitting(true);
      setSubmitError(false);
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            permit_type:       permitType,
            expiry_date:       expiryDate,
            age,
            contact_mode:      contactMode,
            contact_value:     contactVal || '',
            wants_reminder:    checks.reminder,
            consent_marketing: checks.marketing,
            lang,
            calculated_start:  startDate,
            submitted_at:      new Date().toISOString(),
          }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } catch {
        setSubmitError(true);
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    setResult({
      state, icon,
      title: dict[titleKey],
      body: fill(dict[bodyKey]),
      permitLabel,
      expiryFormatted: formatDate(expiryDate, lang),
      startFormatted:  formatDate(startDate, lang),
      daysDisplay,
      reminderText,
    });
    setStep(3);
  }

  function reset() {
    setPermitType(''); setExpiryDate(''); setUserAge('');
    setContactPhone(''); setContactEmail('');
    setChecks({ reminder: false, privacy: false, marketing: false });
    setContactMode('phone');
    setErrors({}); setSubmitError(false); setResult(null);
    setStep(1);
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <img src="/logo-smp.png" alt="Serveis Mèdics Penedès" height="32" />
        </div>
        <div className="topbar-langs">
          {LANGS.map(l => (
            <button
              key={l}
              className={`lang-btn${l === lang ? ' active' : ''}`}
              onClick={() => switchLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="page">
        <div className="card">

          <div className="card-header">
            <div className="header-icon">📋</div>
            <h1>{dict.page_title}</h1>
            <p>{dict.page_subtitle}</p>
          </div>

          <div className="card-body">

            <div className="steps">
              <div className={`step-dot${step === 1 ? ' active' : step > 1 ? ' done' : ''}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <div className={`step-line${step > 1 ? ' done' : ''}`} />
              <div className={`step-dot${step === 2 ? ' active' : step > 2 ? ' done' : ''}`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <div className={`step-line${step > 2 ? ' done' : ''}`} />
              <div className={`step-dot${step === 3 ? ' active' : ''}`}>3</div>
            </div>

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div>
                <div className="field">
                  <label>{dict.f_permit_type}</label>
                  <select
                    className={`input-field${errors.permit ? ' error' : ''}`}
                    value={permitType}
                    onChange={e => { setPermitType(e.target.value); setErrors(p => ({ ...p, permit: false })); }}
                  >
                    <option value="">{dict.f_permit_type_ph}</option>
                    {PERMIT_KEYS.map(key => (
                      <option key={key} value={key}>{dict[`permit_${key}`]}</option>
                    ))}
                  </select>
                  {errors.permit && <div className="field-error">{dict.err_required}</div>}
                </div>

                <div className="field-row">
                  <div className="field">
                    <label>{dict.f_expiry}</label>
                    <input
                      type="date"
                      className={`input-field${errors.expiry ? ' error' : ''}`}
                      value={expiryDate}
                      onChange={e => { setExpiryDate(e.target.value); setErrors(p => ({ ...p, expiry: false })); }}
                    />
                    {errors.expiry && <div className="field-error">{dict.err_required}</div>}
                  </div>
                  <div className="field">
                    <label>{dict.f_age}</label>
                    <input
                      type="number"
                      className={`input-field${errors.age ? ' error' : ''}`}
                      min="14" max="100"
                      placeholder={dict.f_age_ph}
                      value={userAge}
                      onChange={e => { setUserAge(e.target.value); setErrors(p => ({ ...p, age: false })); }}
                    />
                    {errors.age && <div className="field-error">{dict.err_age}</div>}
                  </div>
                </div>

                <div className="btn-row">
                  <button className="btn btn-primary" onClick={goStep2}>
                    <span>{dict.btn_next}</span>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div>
                <div className="field">
                  <label>{dict.f_contact_label}</label>
                  <div className="contact-toggle">
                    <button
                      className={`contact-opt${contactMode === 'phone' ? ' active' : ''}`}
                      onClick={() => { setContactMode('phone'); setErrors(p => ({ ...p, contact: false })); }}
                    >
                      {dict.f_contact_phone}
                    </button>
                    <button
                      className={`contact-opt${contactMode === 'email' ? ' active' : ''}`}
                      onClick={() => { setContactMode('email'); setErrors(p => ({ ...p, contact: false })); }}
                    >
                      {dict.f_contact_email}
                    </button>
                  </div>
                  {contactMode === 'phone' ? (
                    <input
                      type="tel"
                      className="input-field"
                      placeholder={dict.f_phone_ph}
                      style={{ marginTop: '6px' }}
                      value={contactPhone}
                      onChange={e => { setContactPhone(e.target.value); setErrors(p => ({ ...p, contact: false })); }}
                    />
                  ) : (
                    <input
                      type="email"
                      className="input-field"
                      placeholder={dict.f_email_ph}
                      style={{ marginTop: '6px' }}
                      value={contactEmail}
                      onChange={e => { setContactEmail(e.target.value); setErrors(p => ({ ...p, contact: false })); }}
                    />
                  )}
                  {errors.contact && <div className="field-error">{dict.err_contact}</div>}
                </div>

                <div className="field">
                  <div
                    className={`checkbox-field${checks.reminder ? ' checked' : ''}`}
                    onClick={() => toggleCheck('reminder')}
                  >
                    <div className="checkbox-box">{checks.reminder ? '✓' : ''}</div>
                    <div className="checkbox-label">
                      <span>{dict.f_reminder_label}</span>
                      <small>{dict.f_reminder_desc}</small>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <div
                    className={`checkbox-field${checks.privacy ? ' checked' : ''}`}
                    onClick={() => toggleCheck('privacy')}
                  >
                    <div className="checkbox-box">{checks.privacy ? '✓' : ''}</div>
                    <div className="checkbox-label">
                      <span>{dict.f_privacy_label}</span>
                      <small>
                        <a href="#" onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer">
                          {dict.f_privacy_link}
                        </a>
                      </small>
                    </div>
                  </div>
                  {errors.privacy && <div className="field-error">{dict.err_privacy}</div>}
                </div>

                <div className="field">
                  <div
                    className={`checkbox-field${checks.marketing ? ' checked' : ''}`}
                    onClick={() => toggleCheck('marketing')}
                  >
                    <div className="checkbox-box">{checks.marketing ? '✓' : ''}</div>
                    <div className="checkbox-label">
                      <span>{dict.f_marketing_label}</span>
                      <small>{dict.f_marketing_desc}</small>
                    </div>
                  </div>
                </div>

                <div className="btn-row">
                  <button className="btn btn-outline" onClick={goStep1}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{dict.btn_back}</span>
                  </button>
                  <button className="btn btn-primary" onClick={calculate} disabled={submitting}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{submitting ? dict.btn_sending : dict.btn_calculate}</span>
                  </button>
                </div>
                {submitError && <div className="submit-error">{dict.err_submit}</div>}
                <p className="lopd-notice">{dict.lopd_notice}</p>
              </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && result && (
              <div>
                <div className={`result-banner ${result.state}`}>
                  <div className="r-icon">{result.icon}</div>
                  <div className="r-text">
                    <h3>{result.title}</h3>
                    <p>{result.body}</p>
                  </div>
                </div>

                <div className="result-details">
                  <div className="result-detail-row">
                    <span className="r-label">{dict.rd_permit}</span>
                    <span className="r-value">{result.permitLabel}</span>
                  </div>
                  <div className="result-detail-row">
                    <span className="r-label">{dict.rd_expiry}</span>
                    <span className="r-value">{result.expiryFormatted}</span>
                  </div>
                  <div className="result-detail-row">
                    <span className="r-label">{dict.rd_start}</span>
                    <span className="r-value">{result.startFormatted}</span>
                  </div>
                  <div className="result-detail-row">
                    <span className="r-label">{dict.rd_days_left}</span>
                    <span className="r-value" style={{ color: result.daysDisplay.color }}>
                      {result.daysDisplay.text}
                    </span>
                  </div>
                </div>

                {result.reminderText && (
                  <div className="reminder-confirm">
                    <span style={{ fontSize: '20px' }}>✅</span>
                    <span>{result.reminderText}</span>
                  </div>
                )}

                <div className="btn-row">
                  <button className="btn btn-outline" onClick={reset}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{dict.btn_new}</span>
                  </button>
                  <button className="btn btn-primary" onClick={() => window.location.href = LANDING_URL}>
                    <span>{dict.btn_renew_now}</span>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
