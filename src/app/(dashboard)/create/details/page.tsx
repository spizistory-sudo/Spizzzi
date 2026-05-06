'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import WizardProgress from '@/components/wizard/WizardProgress';
import { PERSONALITY_TRAITS as STRUCTURED_TRAITS, getTraitById } from '@/lib/personality-traits-he';

// Section 1 — תכונות אופי (no follow-up)
const PERSONALITY_TRAITS = [
  'חברותי', 'רגיש', 'שקט', 'מנהיג', 'טוב לב', 'אמיץ',
  'רגוע', 'אנרגטי', 'עקשן', 'חולמני', 'סקרן', 'יצירתי',
  'חכם', 'חוקר', 'שובב', 'אחראי', 'עצמאי', 'משתף פעולה',
];

// Section 2 — תחומי עניין (with conditional follow-up)
const INTEREST_TRAITS: { label: string; followUpLabel: string; placeholder: string }[] = [
  { label: 'אוהב חיות', followUpLabel: 'איזו חיה?', placeholder: 'כלבים, חתולים, סוסים...' },
  { label: 'אוהב מוזיקה', followUpLabel: 'איזה סוג מוזיקה? כלי נגינה?', placeholder: 'פסנתר, גיטרה, פופ ישראלי...' },
  { label: 'אוהב ספורט', followUpLabel: 'איזה ספורט? קבוצה אהובה?', placeholder: 'כדורגל, מכבי חיפה, שחייה...' },
  { label: 'אוהב יצירה ואומנות', followUpLabel: 'איזה סוג יצירה?', placeholder: 'ציור, פיסול, מלאכת יד...' },
  { label: 'אוהב לקרוא', followUpLabel: 'איזה סוג ספרים?', placeholder: 'הרפתקאות, קומיקס, פנטזיה...' },
];

const ALL_TRAIT_LABELS = [...PERSONALITY_TRAITS, ...INTEREST_TRAITS.map((i) => i.label)];

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 8,
  color: 'rgba(255, 255, 255, 0.55)',
  fontSize: '0.72rem', letterSpacing: '0.08em',
  fontFamily: 'var(--font-body)', fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '1rem',
  padding: '14px 18px',
  color: 'rgba(255, 255, 255, 0.95)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
};

function focusHandler(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'rgba(126,200,227,0.60)';
  e.currentTarget.style.boxShadow = 'inset 0 0 16px rgba(126,200,227,0.06), 0 0 0 3px rgba(126,200,227,0.12)';
}
function blurHandler(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
  e.currentTarget.style.boxShadow = 'none';
}

export default function DetailsPage() {
  const router = useRouter();
  const {
    selectedThemeSlug, childName, childAge, childTraits, traitDetails: storedTraitDetails,
    setChildDetails, setStep, setLanguage, setTraitDetails: setStoredTraitDetails,
    categoryId, storyMode, language,
  } = useCreationWizard();

  const isStructuredHebrew = language === 'he' && storyMode === 'structured' && !!categoryId;

  const [name, setName] = useState(childName);
  const [age, setAge] = useState(childAge?.toString() || '');
  const [traits, setTraits] = useState<string[]>(childTraits);
  const [interestDetails, setInterestDetails] = useState<Record<string, string>>(storedTraitDetails || {});
  const [error, setError] = useState<string | null>(null);

  // Always Hebrew for pilot
  useEffect(() => { setLanguage('he'); }, [setLanguage]);

  // Guard: must have either a theme slug (legacy) or a category (structured)
  if (!selectedThemeSlug && !categoryId) {
    if (storyMode === 'structured') {
      router.replace('/create/category');
    } else {
      router.replace('/create/theme');
    }
    return null;
  }

  function toggleTrait(trait: string) {
    setTraits((prev) => {
      if (prev.includes(trait)) {
        // Unselect — also clear interest detail
        if (interestDetails[trait]) {
          setInterestDetails((d) => { const next = { ...d }; delete next[trait]; return next; });
        }
        return prev.filter((t) => t !== trait);
      }
      return prev.length < 5 ? [...prev, trait] : prev;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('נא להזין את שם הילד'); return; }
    const ageNum = parseInt(age);
    if (!ageNum || ageNum < 1 || ageNum > 12) { setError('נא להזין גיל תקין (1-12)'); return; }
    if (traits.length === 0) { setError('נא לבחור לפחות תכונה אחת'); return; }

    // For structured Hebrew, store raw IDs — the API enriches them via personality-traits-he.ts
    // For legacy, enrich with follow-up details inline
    const finalTraits = isStructuredHebrew
      ? traits  // raw IDs like ['sensitive', 'creative', 'loves_animals']
      : traits.map((t) => {
          const detail = interestDetails[t];
          if (detail?.trim()) return `${t} (${detail.trim()})`;
          return t;
        });

    setChildDetails(name.trim(), ageNum, finalTraits);
    setStoredTraitDetails(interestDetails);
    setStep('photos');
    router.push('/create/photos');
  }

  const selectedCount = traits.length;

  return (
    <div>
      <WizardProgress currentStep="details" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>ספרו לנו על הילד שלכם</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>הפרטים האלה יהפכו את הסיפור לאישי וקסום באמת.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Name */}
        <div>
          <label htmlFor="childName" style={labelStyle}>שם הילד</label>
          <input id="childName" type="text" value={name} onChange={(e) => setName(e.target.value)}
            style={inputStyle} placeholder="הקלידו את שם הילד" dir="auto"
            onFocus={focusHandler} onBlur={blurHandler}
          />
        </div>

        {/* Age */}
        <div>
          <label htmlFor="childAge" style={labelStyle}>גיל</label>
          <input id="childAge" type="number" min={1} max={12} value={age} onChange={(e) => setAge(e.target.value)}
            style={{ ...inputStyle, width: '120px' }} placeholder="גיל"
            onFocus={focusHandler} onBlur={blurHandler}
          />
        </div>

        {/* Traits — dual mode: structured (ID-based) vs legacy (label-based) */}
        {isStructuredHebrew ? (
          <>
            {/* Structured Hebrew: traits from personality-traits-he.ts, keyed by ID */}
            <div>
              <label style={labelStyle}>
                תכונות אופי ותחומי עניין
                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>
                  ({selectedCount}/5)
                </span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {STRUCTURED_TRAITS.filter(t => !t.has_followup).map((trait) => {
                  const selected = traits.includes(trait.id);
                  return (
                    <button key={trait.id} type="button" onClick={() => toggleTrait(trait.id)}
                      style={{
                        background: selected ? 'rgba(155,125,212,0.35)' : 'rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(8px)',
                        border: selected ? '1px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.14)',
                        color: selected ? '#ffffff' : 'rgba(255,255,255,0.70)',
                        borderRadius: '9999px', padding: '8px 18px',
                        fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 400,
                        cursor: selectedCount >= 5 && !selected ? 'not-allowed' : 'pointer',
                        opacity: selectedCount >= 5 && !selected ? 0.4 : 1,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: selected ? '0 0 16px rgba(155,125,212,0.25)' : 'none',
                      }}
                    >
                      {trait.label_he}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                תחומי עניין
                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>
                  (נספרים מתוך 5 הבחירות)
                </span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {STRUCTURED_TRAITS.filter(t => t.has_followup).map((trait) => {
                  const selected = traits.includes(trait.id);
                  return (
                    <div key={trait.id}>
                      <button type="button" onClick={() => toggleTrait(trait.id)}
                        style={{
                          background: selected ? 'rgba(126,200,227,0.25)' : 'rgba(255,255,255,0.07)',
                          backdropFilter: 'blur(8px)',
                          border: selected ? '1px solid rgba(126,200,227,0.60)' : '1px solid rgba(255,255,255,0.14)',
                          color: selected ? '#ffffff' : 'rgba(255,255,255,0.70)',
                          borderRadius: '9999px', padding: '8px 18px',
                          fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 400,
                          cursor: selectedCount >= 5 && !selected ? 'not-allowed' : 'pointer',
                          opacity: selectedCount >= 5 && !selected ? 0.4 : 1,
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: selected ? '0 0 16px rgba(126,200,227,0.20)' : 'none',
                        }}
                      >
                        {trait.label_he}
                      </button>
                      <div style={{
                        maxHeight: selected ? 80 : 0,
                        opacity: selected ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease',
                        marginTop: selected ? 10 : 0,
                      }}>
                        <label style={{ ...labelStyle, fontSize: '0.68rem', marginBottom: 4, color: 'rgba(126,200,227,0.70)' }}>
                          {trait.followup_placeholder_he}
                        </label>
                        <input
                          type="text"
                          value={interestDetails[trait.id] || ''}
                          onChange={(e) => setInterestDetails((d) => ({ ...d, [trait.id]: e.target.value }))}
                          placeholder={trait.followup_placeholder_he}
                          dir="auto"
                          style={{ ...inputStyle, padding: '10px 14px', fontSize: '0.85rem', borderRadius: '0.75rem' }}
                          onFocus={focusHandler}
                          onBlur={blurHandler}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Legacy mode: hardcoded Hebrew label strings */}
            <div>
              <label style={labelStyle}>
                תכונות אופי
                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>
                  ({selectedCount}/5)
                </span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PERSONALITY_TRAITS.map((trait) => {
                  const selected = traits.includes(trait);
                  return (
                    <button key={trait} type="button" onClick={() => toggleTrait(trait)}
                      style={{
                        background: selected ? 'rgba(155,125,212,0.35)' : 'rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(8px)',
                        border: selected ? '1px solid rgba(155,125,212,0.70)' : '1px solid rgba(255,255,255,0.14)',
                        color: selected ? '#ffffff' : 'rgba(255,255,255,0.70)',
                        borderRadius: '9999px', padding: '8px 18px',
                        fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 400,
                        cursor: selectedCount >= 5 && !selected ? 'not-allowed' : 'pointer',
                        opacity: selectedCount >= 5 && !selected ? 0.4 : 1,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: selected ? '0 0 16px rgba(155,125,212,0.25)' : 'none',
                      }}
                    >
                      {trait}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                תחומי עניין
                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>
                  (נספרים מתוך 5 הבחירות)
                </span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {INTEREST_TRAITS.map((interest) => {
                  const selected = traits.includes(interest.label);
                  return (
                    <div key={interest.label}>
                      <button type="button" onClick={() => toggleTrait(interest.label)}
                        style={{
                          background: selected ? 'rgba(126,200,227,0.25)' : 'rgba(255,255,255,0.07)',
                          backdropFilter: 'blur(8px)',
                          border: selected ? '1px solid rgba(126,200,227,0.60)' : '1px solid rgba(255,255,255,0.14)',
                          color: selected ? '#ffffff' : 'rgba(255,255,255,0.70)',
                          borderRadius: '9999px', padding: '8px 18px',
                          fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: 400,
                          cursor: selectedCount >= 5 && !selected ? 'not-allowed' : 'pointer',
                          opacity: selectedCount >= 5 && !selected ? 0.4 : 1,
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: selected ? '0 0 16px rgba(126,200,227,0.20)' : 'none',
                        }}
                      >
                        {interest.label}
                      </button>
                      <div style={{
                        maxHeight: selected ? 80 : 0,
                        opacity: selected ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease',
                        marginTop: selected ? 10 : 0,
                      }}>
                        <label style={{ ...labelStyle, fontSize: '0.68rem', marginBottom: 4, color: 'rgba(126,200,227,0.70)' }}>
                          {interest.followUpLabel}
                        </label>
                        <input
                          type="text"
                          value={interestDetails[interest.label] || ''}
                          onChange={(e) => setInterestDetails((d) => ({ ...d, [interest.label]: e.target.value }))}
                          placeholder={interest.placeholder}
                          dir="auto"
                          style={{ ...inputStyle, padding: '10px 14px', fontSize: '0.85rem', borderRadius: '0.75rem' }}
                          onFocus={focusHandler}
                          onBlur={blurHandler}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {error && (
          <div style={{ padding: 12, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.30)', borderRadius: '1rem', color: 'rgba(255,150,150,0.95)', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          <button type="button" onClick={() => router.push(isStructuredHebrew ? '/create/topic' : '/create/theme')} className="btn-secondary">
            חזרה
          </button>
          <button type="submit" className="btn-primary">
            הלאה: תמונות
          </button>
        </div>
      </form>
    </div>
  );
}
