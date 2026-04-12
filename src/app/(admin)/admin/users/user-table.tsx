'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  display_name: string | null;
  subscription_tier: string;
  monthly_credits: number;
  credits_used_this_month: number;
  is_admin: boolean;
  created_at: string;
  book_count: number;
}

export default function UserTable({ users }: { users: User[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    setUpdating(userId);
    await supabase.from('profiles').update({ is_admin: !isAdmin }).eq('id', userId);
    router.refresh();
    setUpdating(null);
  }

  async function adjustCredits(userId: string, currentCredits: number) {
    const newCredits = prompt('Set monthly credits:', currentCredits.toString());
    if (newCredits === null) return;
    const num = parseInt(newCredits);
    if (isNaN(num)) return;

    await supabase.from('profiles').update({ monthly_credits: num }).eq('id', userId);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Tier</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Credits</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Books</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Admin</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {user.display_name || 'No name'}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                  {user.subscription_tier}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {user.credits_used_this_month}/{user.monthly_credits}
              </td>
              <td className="px-4 py-3 text-gray-500">{user.book_count}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleAdmin(user.id, user.is_admin)}
                  disabled={updating === user.id}
                  className={`w-8 h-5 rounded-full transition ${
                    user.is_admin ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      user.is_admin ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => adjustCredits(user.id, user.monthly_credits)}
                  className="text-xs text-purple-600 hover:underline"
                >
                  Adjust credits
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
