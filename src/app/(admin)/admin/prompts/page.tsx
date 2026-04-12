'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { STORY_SYSTEM_PROMPT, STORY_SYSTEM_PROMPT_HE } from '@/lib/ai/prompts/story-system';
import { ART_STYLES } from '@/lib/ai/prompts/style-references';

// All editable prompt types — grouped into categories
interface PromptEntry {
  key: string;
  label: string;
  category: string;
  defaultValue: string;
  description: string;
}

const COVER_PROMPT_TEMPLATE = `Create a children's book cover illustration.
Art style: {stylePrompt}
Title: "{bookTitle}"
Main character: {characterDescription}
Scene: The cover should show a scene that captures the essence of this story theme: {themeDescription}
The illustration should feel magical, warm, and inviting.
CRITICAL: Do NOT include any text, words, letters, numbers, or writing of any kind in the illustration. The image should contain ONLY visual elements — no text whatsoever. The title will be overlaid separately.
CRITICAL: Generate ONLY the scene illustration itself. Do NOT draw a book, book pages, book binding, page edges, spine, or any book-related frame around the image. The output should be a standalone illustration that fills the entire image — as if you are painting directly onto a flat canvas. No borders, no frames, no book effects, no page curl effects.
Aspect ratio: 3:4 portrait (book cover proportions).`;

const PAGE_PROMPT_TEMPLATE = `Create an illustration for page {pageNumber} of a children's book.
Art style: {stylePrompt}
Main character description: {characterDescription}
The main character must look consistent across all pages — same face, hair, proportions, and outfit style.

Scene to illustrate: {illustrationPrompt}
Mood: {mood}

CRITICAL: Do NOT include any text, words, letters, numbers, or writing of any kind in the illustration. The image should contain ONLY visual elements — no text whatsoever.
CRITICAL: Generate ONLY the scene illustration itself. Do NOT draw a book, book pages, book binding, page edges, spine, or any book-related frame around the image. The output should be a standalone illustration that fills the entire image — as if you are painting directly onto a flat canvas. No borders, no frames, no book effects, no page curl effects.
Aspect ratio: 3:2 landscape (book page spread).`;

const PHOTO_ANALYSIS_PROMPT = `Analyze this photo of a child and provide a detailed visual description that an AI image generator can use to consistently recreate this character in illustrated children's book style.

Include:
- Approximate age
- Hair color, style, and length
- Eye color
- Skin tone
- Any distinctive features (dimples, freckles, glasses, etc.)
- What they're wearing (we may change outfits but note the style)
- Their overall expression/energy

Format as a single paragraph, purely descriptive. Do NOT include the child's name.`;

const ALL_PROMPTS: PromptEntry[] = [
  // System prompts
  { key: 'story_system_en', label: 'Story System Prompt (English)', category: 'System Prompts', defaultValue: STORY_SYSTEM_PROMPT.trim(), description: 'The system instruction sent to Gemini when generating stories in English.' },
  { key: 'story_system_he', label: 'Story System Prompt (Hebrew)', category: 'System Prompts', defaultValue: STORY_SYSTEM_PROMPT_HE.trim(), description: 'The system instruction for Hebrew story generation.' },
  // Illustration prompts
  { key: 'cover_illustration', label: 'Cover Illustration Prompt', category: 'Illustration Prompts', defaultValue: COVER_PROMPT_TEMPLATE, description: 'Template for generating cover images. Variables: {stylePrompt}, {bookTitle}, {characterDescription}, {themeDescription}' },
  { key: 'page_illustration', label: 'Page Illustration Prompt', category: 'Illustration Prompts', defaultValue: PAGE_PROMPT_TEMPLATE, description: 'Template for generating page illustrations. Variables: {pageNumber}, {stylePrompt}, {characterDescription}, {illustrationPrompt}, {mood}' },
  { key: 'photo_analysis', label: 'Photo Analysis Prompt', category: 'Illustration Prompts', defaultValue: PHOTO_ANALYSIS_PROMPT, description: 'Prompt sent to Gemini Vision when analyzing a child photo.' },
  // Art style descriptions
  { key: 'style_watercolor', label: 'Watercolor Dream — Style Description', category: 'Art Styles', defaultValue: ART_STYLES.watercolor.stylePrompt, description: 'Injected into {stylePrompt} when user selects Watercolor.' },
  { key: 'style_cartoon', label: 'Bold & Bright — Style Description', category: 'Art Styles', defaultValue: ART_STYLES.cartoon.stylePrompt, description: 'Injected into {stylePrompt} when user selects Cartoon.' },
  { key: 'style_storybook', label: 'Classic Storybook — Style Description', category: 'Art Styles', defaultValue: ART_STYLES.storybook.stylePrompt, description: 'Injected into {stylePrompt} when user selects Storybook.' },
];

interface SavedPrompt {
  key: string;
  prompt_text: string;
  version: number;
  notes: string | null;
  created_at: string;
}

export default function PromptsPage() {
  const supabase = createClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<SavedPrompt[]>([]);
  // Also load per-theme story prompts
  const [themes, setThemes] = useState<Array<{ id: string; slug: string; name: string; prompt_template: string }>>([]);

  useEffect(() => {
    supabase.from('themes').select('id, slug, name, prompt_template').order('name').then(({ data }) => {
      if (data) setThemes(data);
    });
  }, [supabase]);

  // Build full list including per-theme prompts
  const allEntries: PromptEntry[] = [
    ...ALL_PROMPTS,
    ...themes.map((t) => ({
      key: `theme_${t.slug}`,
      label: `${t.name} — Story Template`,
      category: 'Theme Story Prompts',
      defaultValue: t.prompt_template,
      description: `Per-theme story prompt template for "${t.name}". Variables: {pageCount}, {age}, {childName}, {traits}, {trait_power}`,
    })),
  ];

  const categories = [...new Set(allEntries.map((e) => e.category))];
  const selected = allEntries.find((e) => e.key === selectedKey);

  async function selectPrompt(entry: PromptEntry) {
    setSelectedKey(entry.key);
    setNotes('');

    // Load saved versions from prompt_versions table
    const { data } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_type', entry.key)
      .order('version', { ascending: false })
      .limit(20);

    const savedVersions = (data as SavedPrompt[]) || [];
    setVersions(savedVersions);

    // Use latest saved version if available, otherwise default
    if (savedVersions.length > 0) {
      setPromptText(savedVersions[0].prompt_text || entry.defaultValue);
    } else {
      setPromptText(entry.defaultValue);
    }
  }

  async function savePrompt() {
    if (!selected) return;
    setSaving(true);

    const nextVersion = (versions[0]?.version || 0) + 1;
    const { data: { user } } = await supabase.auth.getUser();

    // Save to prompt_versions
    await supabase.from('prompt_versions').insert({
      prompt_type: selected.key,
      prompt_text: promptText,
      version: nextVersion,
      notes: notes || null,
      created_by: user?.id,
    });

    // For theme prompts, also update the themes table
    if (selected.key.startsWith('theme_')) {
      const theme = themes.find((t) => `theme_${t.slug}` === selected.key);
      if (theme) {
        await supabase.from('themes').update({ prompt_template: promptText }).eq('id', theme.id);
      }
    }

    // Refresh versions
    const { data } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_type', selected.key)
      .order('version', { ascending: false })
      .limit(20);
    setVersions((data as SavedPrompt[]) || []);
    setNotes('');
    setSaving(false);
  }

  function restoreVersion(v: SavedPrompt) {
    setPromptText(v.prompt_text);
  }

  function resetToDefault() {
    if (!selected) return;
    setPromptText(selected.defaultValue);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Prompt Editor</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1.5 px-3">{cat}</p>
              <div className="space-y-0.5">
                {allEntries
                  .filter((e) => e.category === cat)
                  .map((entry) => (
                    <button
                      key={entry.key}
                      onClick={() => selectPrompt(entry)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        selectedKey === entry.key
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {entry.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">{selected.label}</h2>
              <p className="text-xs text-gray-400 mb-4">{selected.description}</p>

              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={18}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
              />

              <div className="flex items-center gap-3 mt-3">
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Version notes (optional)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={savePrompt}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Version'}
                </button>
                <button
                  onClick={resetToDefault}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
                >
                  Reset to Default
                </button>
              </div>

              {/* Version history */}
              {versions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Version History ({versions.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {versions.map((v) => (
                      <div
                        key={v.created_at}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-700">v{v.version}</span>
                          {v.notes && <span className="text-sm text-gray-400 ml-2">— {v.notes}</span>}
                          <p className="text-xs text-gray-400">{new Date(v.created_at).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => restoreVersion(v)}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Select a prompt to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
