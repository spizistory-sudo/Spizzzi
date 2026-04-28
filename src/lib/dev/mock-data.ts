import type { GeneratedStory } from '@/types/ai';

export function getMockStory(
  childName: string,
  pageCount: number,
  language: 'en' | 'he' = 'en'
): GeneratedStory {
  const storyTextsEn = [
    `Once upon a time, ${childName} found a magical golden key hidden under the oldest oak tree in the garden. It shimmered with a soft purple glow.`,
    `${childName} picked up the key and felt a warm tingle in their fingers. "I wonder what this opens," ${childName} whispered, eyes wide with excitement.`,
    `Following a trail of glowing footprints, ${childName} arrived at a tiny door carved into the trunk of the tree. The key fit perfectly!`,
    `Behind the door was a world of floating islands and rainbow waterfalls. A friendly fox with silver wings flew down to greet ${childName}.`,
    `"Welcome to the Enchanted Garden!" said the fox. "We've been waiting for someone brave enough to find the key."`,
    `The fox led ${childName} across a bridge made of flower petals to meet the Garden Queen — a kind old turtle wearing a crown of daisies.`,
    `"Our magic fountain has stopped flowing," said the Queen. "Only someone with a kind heart can restart it." She looked at ${childName} hopefully.`,
    `${childName} placed both hands in the fountain and thought about all the people they loved. Slowly, golden water began to bubble up between their fingers.`,
    `The fountain burst to life! Flowers bloomed everywhere, butterflies filled the air, and the floating islands began to glow with warm, golden light.`,
    `"Thank you, ${childName}!" everyone cheered. And from that day on, ${childName} knew that the real magic had been inside them all along. The End.`,
  ];

  const storyTextsHe = [
    `יום אחד, ${childName} מצא מפתח זהב קסום מתחת לעץ האלון הכי ישן בגינה. המפתח נצנץ באור סגול רך.`,
    `${childName} הרים את המפתח והרגיש דגדוג חם באצבעות. "מה זה פותח?" לחש ${childName}, עם עיניים גדולות מהתרגשות.`,
    `${childName} הלך אחרי עקבות זוהרות והגיע לדלת קטנטנה חקוקה בגזע העץ. המפתח התאים בדיוק!`,
    `מאחורי הדלת היה עולם של איים מרחפים ומפלי קשת בענן. שועל חברותי עם כנפיים כסופות עף לקבל את פני ${childName}.`,
    `"ברוך הבא לגן הקסום!" אמר השועל. "חיכינו למישהו אמיץ מספיק שימצא את המפתח."`,
    `השועל הוביל את ${childName} על גשר עשוי עלי כותרת ענקיים לפגוש את מלכת הגן — צב חכם וטוב לב עם כתר של חינניות.`,
    `"המזרקה הקסומה שלנו הפסיקה לזרום," אמרה המלכה. "רק מישהו עם לב טוב יכול להפעיל אותה מחדש." היא הסתכלה על ${childName} בתקווה.`,
    `${childName} שם את שתי הידיים במזרקה וחשב על כל האנשים שהוא אוהב. לאט לאט, מים זהובים התחילו לבעבע בין האצבעות.`,
    `המזרקה התעוררה לחיים! פרחים פרחו בכל מקום, פרפרים מילאו את האוויר, והאיים המרחפים התחילו לזהור באור חם וזהוב.`,
    `"תודה, ${childName}!" כולם צהלו. ומאותו יום, ${childName} ידע שהקסם האמיתי היה בתוכו כל הזמן. סוף.`,
  ];

  const moods: Array<'happy' | 'adventurous' | 'magical' | 'excited' | 'cozy' | 'triumphant'> = [
    'magical', 'adventurous', 'excited', 'magical', 'happy',
    'cozy', 'adventurous', 'magical', 'triumphant', 'happy',
  ];

  const prompts = [
    'A child kneeling under a large oak tree, finding a glowing purple key among the roots. Golden afternoon light, magical sparkles.',
    'Close-up of a child holding a shimmering key, looking amazed. Warm garden background with flowers.',
    'A tiny ornate door carved into a massive tree trunk, with glowing footprints leading to it. Magical forest setting.',
    'A breathtaking fantasy landscape with floating islands, rainbow waterfalls, and a silver-winged fox flying.',
    'A friendly silver-winged fox talking to an amazed child on a floating island. Whimsical, warm atmosphere.',
    'A bridge made of giant flower petals spanning between floating islands. A wise turtle with a daisy crown.',
    'A beautiful but dry stone fountain in a magical garden. A kind old turtle queen looking hopefully at a child.',
    'A child with hands in a fountain, golden water flowing between their fingers. Magical glow emanating outward.',
    'An explosion of color — flowers blooming, butterflies everywhere, floating islands glowing golden.',
    'A child waving goodbye to magical friends at sunset. Warm, cozy, nostalgic feeling.',
  ];

  const storyTexts = language === 'he' ? storyTextsHe : storyTextsEn;

  const pages = Array.from({ length: pageCount }, (_, i) => ({
    page_number: i + 1,
    text: storyTexts[i % storyTexts.length],
    illustration_prompt: prompts[i % prompts.length],
    mood: moods[i % moods.length],
  }));

  return {
    title: language === 'he' ? `${childName} והרפתקת הקסם` : `${childName}'s Magical Adventure`,
    pages,
  };
}

export const MOCK_CHARACTER_DESCRIPTION = `A 7-year-old boy with messy, medium-length brown hair that falls just above his eyebrows. He has large, warm brown eyes with long eyelashes, a small upturned nose, rosy cheeks with light freckles across the bridge of his nose, and a wide friendly smile. He has light olive skin. He is wearing a blue t-shirt with a small yellow star on the chest, dark gray pants, and red sneakers. He is slim and average height for his age. His expression is curious and cheerful.`;

export function generateSilentMp3(durationSeconds: number): Buffer {
  const framesNeeded = Math.ceil((durationSeconds * 1000) / 26.12);
  const frameSize = 417;
  const frameHeader = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
  const framePadding = Buffer.alloc(frameSize - 4, 0);
  const frames: Buffer[] = [];
  for (let i = 0; i < framesNeeded; i++) {
    frames.push(frameHeader);
    frames.push(framePadding);
  }
  return Buffer.concat(frames);
}
