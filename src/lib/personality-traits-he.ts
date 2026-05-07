export interface PersonalityTrait {
  id: string;
  label_he: string;
  category: 'social' | 'emotional' | 'curiosity' | 'values' | 'interests';
  prompt_instruction: string;
  has_followup?: boolean;
  followup_placeholder_he?: string;
}

export const PERSONALITY_TRAITS: PersonalityTrait[] = [
  // Social
  { id: 'social', label_he: 'חברותי', category: 'social',
    prompt_instruction: 'הגיבור יוצר קשרים עם דמויות אחרות, מעדיף פעילות קבוצתית, פותר בעיות דרך שיחה' },
  { id: 'sensitive', label_he: 'רגיש', category: 'social',
    prompt_instruction: 'הגיבור שם לב לרגשות של אחרים, יש לו עומק פנימי, מגיב ברגישות לסביבה' },
  { id: 'quiet', label_he: 'שקט', category: 'social',
    prompt_instruction: 'הגיבור מתבונן יותר ממדבר, פתרונות פנימיים, עולם פנימי עשיר' },
  { id: 'leader', label_he: 'מנהיג', category: 'social',
    prompt_instruction: 'הגיבור לוקח אחריות, מארגן אחרים, יוזם פתרונות' },
  { id: 'kindhearted', label_he: 'טוב לב', category: 'social',
    prompt_instruction: 'הגיבור אכפתי לאחרים, נדיב, רואה את הצרכים של מי שמסביב' },

  // Emotional
  { id: 'brave', label_he: 'אמיץ', category: 'emotional',
    prompt_instruction: 'הגיבור לא נרתע מאתגרים, מנסה דברים חדשים, פועל גם כשמפחיד' },
  { id: 'calm', label_he: 'רגוע', category: 'emotional',
    prompt_instruction: 'הגיבור איטי וסבלני, יציב במצבי לחץ, מקור רוגע לסביבה' },
  { id: 'energetic', label_he: 'אנרגטי', category: 'emotional',
    prompt_instruction: 'הגיבור מלא תנועה ופעולה, קצב מהיר, התלהבות' },
  { id: 'persistent', label_he: 'עקשן', category: 'emotional',
    prompt_instruction: 'הגיבור לא מוותר, מנסה שוב ושוב, התמדה גם כשקשה' },
  { id: 'dreamy', label_he: 'חולמני', category: 'emotional',
    prompt_instruction: 'הגיבור בעל דמיון פעיל, רעיונות בלתי-שגרתיים, רואה את העולם דרך פנטזיה' },

  // Curiosity
  { id: 'curious', label_he: 'סקרן', category: 'curiosity',
    prompt_instruction: 'הגיבור שואל שאלות, מחפש תשובות, רוצה להבין' },
  { id: 'creative', label_he: 'יצירתי', category: 'curiosity',
    prompt_instruction: 'הגיבור מוצא פתרונות מקוריים, אומנותי, חושב מחוץ לקופסה' },
  { id: 'smart', label_he: 'חכם', category: 'curiosity',
    prompt_instruction: 'הגיבור מבין מהר, מקשר רעיונות, חושב לעומק' },
  { id: 'investigator', label_he: 'חוקר', category: 'curiosity',
    prompt_instruction: 'הגיבור מנסה להבין איך דברים עובדים, מבצע ניסויים, מתעמק' },
  { id: 'playful', label_he: 'שובב', category: 'curiosity',
    prompt_instruction: 'הגיבור מלא הומור, יוצר מצבים מצחיקים, פתרונות בלתי-צפויים' },

  // Values
  { id: 'honest', label_he: 'כן', category: 'values',
    prompt_instruction: 'הגיבור אומר את האמת גם כשקשה, יש לו יושר פנימי' },
  { id: 'responsible', label_he: 'אחראי', category: 'values',
    prompt_instruction: 'אפשר לסמוך על הגיבור, ממלא משימות, מעריך מחויבויות' },
  { id: 'independent', label_he: 'עצמאי', category: 'values',
    prompt_instruction: 'הגיבור עושה לבד, לא מסתמך, מחפש את דרכו' },
  { id: 'cooperative', label_he: 'משתף פעולה', category: 'values',
    prompt_instruction: 'הגיבור עובד עם אחרים יפה, מקשיב, מתאים את עצמו' },

  // Interests
  { id: 'loves_animals', label_he: 'אוהב חיות', category: 'interests',
    prompt_instruction: 'דמות עוזרת היא חיה, או מקום ההתרחשות כולל חיות',
    has_followup: true, followup_placeholder_he: 'איזה חיות הוא אוהב?' },
  { id: 'loves_music', label_he: 'אוהב מוזיקה', category: 'interests',
    prompt_instruction: 'יש שיר חוזר, דמות מוזיקלית, או רגע של מוזיקה משמעותי',
    has_followup: true, followup_placeholder_he: 'איזה מוזיקה?' },
  { id: 'loves_sports', label_he: 'אוהב ספורט', category: 'interests',
    prompt_instruction: 'תנועה, פעילות פיזית, אתגר גופני בסיפור',
    has_followup: true, followup_placeholder_he: 'איזה ספורט?' },
  { id: 'loves_art', label_he: 'אוהב יצירה ואומנות', category: 'interests',
    prompt_instruction: 'ציור, בנייה, יצירת משהו כחלק מהפתרון',
    has_followup: true, followup_placeholder_he: 'מה הוא אוהב ליצור?' },
  { id: 'loves_reading', label_he: 'אוהב לקרוא', category: 'interests',
    prompt_instruction: 'ספר משחק תפקיד, ידע מספרים עוזר, מטאפורות ספרותיות',
    has_followup: true, followup_placeholder_he: 'איזה ספרים?' },
];

export function getTraitById(id: string): PersonalityTrait | undefined {
  return PERSONALITY_TRAITS.find(t => t.id === id);
}

export function getTraitsByCategory(category: PersonalityTrait['category']): PersonalityTrait[] {
  return PERSONALITY_TRAITS.filter(t => t.category === category);
}
