'use client';

import { useRouter } from 'next/navigation';
import { useCreationWizard } from '@/stores/creation-wizard';
import { THEME_LIST } from '@/lib/ai/prompts/story-themes';
import WizardProgress from '@/components/wizard/WizardProgress';

const THEME_HE: Record<string, { name: string; description: string; category: string }> = {
  superhero: { name: 'הרפתקת גיבור-העל', description: 'הילד מגלה שיש לו כוח-על מיוחד ומציל את היום', category: 'גיבורי-על' },
  underwater: { name: 'צלילה אל מעמקי הים', description: 'הרפתקה תת-מימית שבה הילד מתיידד עם יצורי ים ומגלה אוצר חבוי', category: 'הרפתקה' },
  chef: { name: 'המטבח הקסום', description: 'הילד מגלה מטבח שבו המרכיבים מתעוררים לחיים והם מבשלים יחד מנה קסומה', category: 'אוכל' },
  space: { name: 'מסע אל הכוכבים', description: 'הרפתקה בחלל שבה הילד מגלה כוכבי לכת ופוגש חייזרים ידידותיים', category: 'הרפתקה' },
  dinosaur: { name: 'יום עם הדינוזאורים', description: 'הילד נוסע במכונת זמן לעידן הדינוזאורים ומכיר חברים פרהיסטוריים', category: 'חיות' },
  fairy: { name: 'הגן הקסום', description: 'הילד מתכווץ לגודל פיה ועוזר ליצורים קסומים בגן מכושף', category: 'פנטזיה' },
  pirate: { name: 'המסע לאי האוצר', description: 'הילד הופך לקפטן פיראט ידידותי ומפליג לחפש אוצר חבוי', category: 'הרפתקה' },
  sports: { name: 'המשחק הגדול', description: 'הילד מצטרף לקבוצה של חיות ידידותיות למשחק הגדול של השנה', category: 'ספורט' },
  music: { name: 'הקונצרט הקסום', description: 'הילד מגלה כלי נגינה קסומים שיוצרים צלילים צבעוניים ומפיק קונצרט', category: 'מוזיקה' },
  winter: { name: 'ממלכת השלג', description: 'הילד מגיע לממלכת שלג קסומה ועוזר להכין חגיגה מיוחדת', category: 'פנטזיה' },
};

export default function ThemePickerPage() {
  const router = useRouter();
  const { selectedThemeSlug, setTheme } = useCreationWizard();

  function handleSelectTheme(slug: string) {
    setTheme(slug);
    router.push('/create/details');
  }

  return (
    <div>
      <WizardProgress currentStep="theme" />

      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>בחרו נושא לסיפור</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          בחרו את ההרפתקה המושלמת לילד שלכם — כל נושא יוצר סיפור אישי וייחודי
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEME_LIST.map((theme) => {
          const isSelected = selectedThemeSlug === theme.slug;
          const he = THEME_HE[theme.slug];
          return (
            <button
              key={theme.slug}
              onClick={() => handleSelectTheme(theme.slug)}
              className="text-start transition-all duration-300"
              style={{
                padding: '24px',
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(12px) saturate(150%)',
                WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                border: isSelected ? '2px solid #F5C842' : '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: isSelected
                  ? 'inset 0 0 20px rgba(255,255,255,0.04), 0 0 0 1px #F5C842, 0 0 28px rgba(245,200,66,0.30)'
                  : 'inset 0 0 20px rgba(255, 255, 255, 0.04), 0 8px 32px rgba(0, 0, 0, 0.25)',
                borderRadius: '1.5rem',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(245, 200, 66, 0.45)';
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.30), 0 0 0 1px rgba(245,200,66,0.20)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.10)';
                  e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(255, 255, 255, 0.04), 0 8px 32px rgba(0, 0, 0, 0.25)';
                }
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{theme.emoji}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                {he?.name || theme.name}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.80)', lineHeight: 1.6 }}>
                {he?.description || theme.description}
              </p>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.70)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                }}>
                  {he?.category || theme.category}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                  גילאי {theme.ageRange[0]}-{theme.ageRange[1]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
