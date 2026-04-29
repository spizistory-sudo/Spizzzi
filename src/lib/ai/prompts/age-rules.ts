export interface AgeRules {
  ageRange: '2-4' | '4-6' | '6-8' | '8-12';
  rhymeRequired: boolean;
  rhymeOptional: boolean;
  niqqudFull: boolean;
  niqqudPartial: boolean;
  spreadCount: { min: number; max: number };
  wordsPerSpread: { min: number; max: number };
  vocabularyLevel: string;
  conflictComplexity: string;
  pointOfView: ('first_person' | 'third_person')[];
}

export function getAgeRules(age: number): AgeRules {
  const niqqudEnabled = process.env.NIQQUD_ENABLED === 'true';

  let base: AgeRules;
  if (age >= 2 && age <= 4) {
    base = {
      ageRange: '2-4',
      rhymeRequired: true, rhymeOptional: false,
      niqqudFull: true, niqqudPartial: false,
      spreadCount: { min: 6, max: 8 },
      wordsPerSpread: { min: 18, max: 25 },
      vocabularyLevel: 'מילים שילד בן 3 משתמש בהן בעצמו או מבין מהקשר',
      conflictComplexity: 'קונפליקט פיזי פשוט (משהו קרה, נשבר, אבד)',
      pointOfView: ['third_person'],
    };
  } else if (age >= 4 && age <= 6) {
    base = {
      ageRange: '4-6',
      rhymeRequired: true, rhymeOptional: false,
      niqqudFull: true, niqqudPartial: false,
      spreadCount: { min: 8, max: 10 },
      wordsPerSpread: { min: 22, max: 30 },
      vocabularyLevel: 'אוצר מילים של ילד בכיתה חובה / טרום-חובה',
      conflictComplexity: 'קונפליקט מצטבר (כמה דברים קטנים) ולא אירוע יחיד',
      pointOfView: ['third_person'],
    };
  } else if (age >= 6 && age <= 8) {
    base = {
      ageRange: '6-8',
      rhymeRequired: false, rhymeOptional: true,
      niqqudFull: false, niqqudPartial: true,
      spreadCount: { min: 10, max: 12 },
      wordsPerSpread: { min: 70, max: 100 },
      vocabularyLevel: 'אוצר מילים של ילד בכיתה א-ב',
      conflictComplexity: 'קונפליקט מורכב: בין שתי טובות, פגיעה לא-מתוכננת, רגשות סותרים',
      pointOfView: ['first_person', 'third_person'],
    };
  } else {
    base = {
      ageRange: '8-12',
      rhymeRequired: false, rhymeOptional: false,
      niqqudFull: false, niqqudPartial: false,
      spreadCount: { min: 12, max: 16 },
      wordsPerSpread: { min: 100, max: 200 },
      vocabularyLevel: 'אוצר מילים עשיר, משפטים מורכבים',
      conflictComplexity: 'קונפליקט פנימי או רגשי מורכב, אפשר אמביוולנטיות',
      pointOfView: ['first_person', 'third_person'],
    };
  }

  // Override niqqud if globally disabled
  if (!niqqudEnabled) {
    base.niqqudFull = false;
    base.niqqudPartial = false;
  }

  return base;
}
