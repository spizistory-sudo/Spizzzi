'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#9333ea', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

interface AnalyticsChartsProps {
  dailyData: Array<{ date: string; books: number }>;
  themeData: Array<{ name: string; count: number }>;
  styleData: Array<{ name: string; value: number }>;
}

export default function AnalyticsCharts({ dailyData, themeData, styleData }: AnalyticsChartsProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Books per day */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Books per day (last 30 days)</h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="books" fill="#9333ea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm py-12 text-center">No data yet</p>
        )}
      </div>

      {/* Popular themes */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Popular themes</h3>
        {themeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={themeData} layout="vertical">
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" fontSize={11} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm py-12 text-center">No data yet</p>
        )}
      </div>

      {/* Cover style distribution */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Cover style distribution</h3>
        {styleData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={styleData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                fontSize={12}
              >
                {styleData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm py-12 text-center">No data yet</p>
        )}
      </div>
    </div>
  );
}
