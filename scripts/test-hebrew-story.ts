import { config } from 'dotenv';
config({ path: '.env.local' });
import { generateStructuredHebrewStory } from '../src/lib/ai/story-generator';

async function main() {
  console.log('Testing structured Hebrew story generation...\n');

  const result = await generateStructuredHebrewStory({
    childName: 'נֹעַם',
    childAge: 5,
    childGender: 'male',
    traits: ['sensitive', 'creative'],
    traitDetails: {},
    categoryId: 'emotions',
    topicId: 'anger_eruption',
  });

  console.log('=== RESULT ===');
  console.log('Title:', result.story.title);
  console.log('Spreads:', result.story.spreads.length);
  console.log('Attempts:', result.attempts);
  console.log('Validation issues:', result.validationIssues);
  console.log('\n=== DYNAMIC KNOBS ===');
  console.log(result.knobs);
  console.log('\n=== FIRST SPREAD ===');
  console.log('Text:', result.story.spreads[0].text);
  console.log('Text for TTS:', result.story.spreads[0].text_for_tts);
  console.log('Illustration prompt:', result.story.spreads[0].illustration_prompt);
}

main().catch(console.error);
