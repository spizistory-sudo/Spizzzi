export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import AnalyticsCharts from './charts';

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Fetch stats
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalBooks } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true });

  const today = new Date().toISOString().split('T')[0];
  const { count: booksToday } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00`);

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: booksThisWeek } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo);

  // Books per day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: recentBooks } = await supabase
    .from('books')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at');

  const booksPerDay: Record<string, number> = {};
  (recentBooks || []).forEach((b) => {
    const day = new Date(b.created_at).toISOString().split('T')[0];
    booksPerDay[day] = (booksPerDay[day] || 0) + 1;
  });
  const dailyData = Object.entries(booksPerDay).map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    books: count,
  }));

  // Popular themes
  const { data: themeData } = await supabase
    .from('books')
    .select('metadata');

  const themeCounts: Record<string, number> = {};
  (themeData || []).forEach((b) => {
    const slug = (b.metadata as Record<string, string>)?.themeSlug || 'unknown';
    themeCounts[slug] = (themeCounts[slug] || 0) + 1;
  });
  const themeChartData = Object.entries(themeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Cover style distribution
  const { data: coverData } = await supabase
    .from('cover_options')
    .select('style_name')
    .eq('is_selected', true);

  const styleCounts: Record<string, number> = {};
  (coverData || []).forEach((c) => {
    styleCounts[c.style_name] = (styleCounts[c.style_name] || 0) + 1;
  });
  const styleChartData = Object.entries(styleCounts).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: 'Total Users', value: totalUsers || 0 },
    { label: 'Total Books', value: totalBooks || 0 },
    { label: 'Books Today', value: booksToday || 0 },
    { label: 'Books This Week', value: booksThisWeek || 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <AnalyticsCharts
        dailyData={dailyData}
        themeData={themeChartData}
        styleData={styleChartData}
      />
    </div>
  );
}
