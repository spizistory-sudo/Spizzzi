'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Theme {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  age_range_min: number;
  age_range_max: number;
  page_count: number;
  is_active: boolean;
  prompt_template: string;
}

export default function ThemesPage() {
  const supabase = createClient();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [editing, setEditing] = useState<Theme | null>(null);

  useEffect(() => {
    loadThemes();
  }, []);

  async function loadThemes() {
    const { data } = await supabase
      .from('themes')
      .select('*')
      .order('name');
    if (data) setThemes(data as Theme[]);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await supabase.from('themes').update({ is_active: !isActive }).eq('id', id);
    loadThemes();
  }

  async function saveTheme() {
    if (!editing) return;
    const { id, ...data } = editing;
    if (id) {
      await supabase.from('themes').update(data).eq('id', id);
    } else {
      await supabase.from('themes').insert(data);
    }
    setEditing(null);
    loadThemes();
  }

  async function deleteTheme(id: string) {
    if (!confirm('Delete this theme?')) return;
    await supabase.from('themes').delete().eq('id', id);
    loadThemes();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Theme Manager</h1>
        <button
          onClick={() =>
            setEditing({
              id: '',
              slug: '',
              name: '',
              description: '',
              category: '',
              age_range_min: 3,
              age_range_max: 8,
              page_count: 10,
              is_active: true,
              prompt_template: '',
            })
          }
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
        >
          Add Theme
        </button>
      </div>

      {/* Theme table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Ages</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Pages</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Active</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {themes.map((theme) => (
              <tr key={theme.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{theme.name}</td>
                <td className="px-4 py-3 text-gray-500">{theme.category}</td>
                <td className="px-4 py-3 text-gray-500">
                  {theme.age_range_min}-{theme.age_range_max}
                </td>
                <td className="px-4 py-3 text-gray-500">{theme.page_count}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(theme.id, theme.is_active)}
                    className={`w-8 h-5 rounded-full transition ${
                      theme.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        theme.is_active ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(theme)}
                      className="text-purple-600 hover:underline text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTheme(theme.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {themes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No themes in database. Themes are currently defined in code.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editing.id ? 'Edit Theme' : 'Add Theme'}
            </h2>
            <div className="space-y-3">
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="Slug (e.g., superhero)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                placeholder="Category"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <textarea
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Description"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <textarea
                value={editing.prompt_template}
                onChange={(e) => setEditing({ ...editing, prompt_template: e.target.value })}
                placeholder="Prompt template"
                rows={8}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
              <div className="flex gap-2">
                <button onClick={saveTheme} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">
                  Save
                </button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
