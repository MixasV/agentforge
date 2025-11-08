import { useCredits } from '@/hooks/useCredits';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export function UsageChart() {
  const { usage, isLoading } = useCredits();

  // Use data from backend (which includes dailyBreakdown)
  const chartData = usage?.dailyBreakdown || [
    { day: 'Mon', credits: 250 },
    { day: 'Tue', credits: 420 },
    { day: 'Wed', credits: 380 },
    { day: 'Thu', credits: 510 },
    { day: 'Fri', credits: 290 },
    { day: 'Sat', credits: 160 },
    { day: 'Sun', credits: 190 },
  ];

  if (isLoading) {
    return (
      <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
        <div className="animate-pulse">
          <div className="h-4 bg-dark-bg rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-dark-bg rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Usage Statistics</h2>
        <div className="p-2 bg-blue-400/10 rounded-lg">
          <TrendingUp size={20} className="text-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-bg rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Today</p>
          <p className="text-xl font-semibold text-blue-400">
            {usage?.todayUsage?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500">credits</p>
        </div>

        <div className="bg-dark-bg rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">This Week</p>
          <p className="text-xl font-semibold text-purple-400">
            {usage?.weekUsage?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500">credits</p>
        </div>

        <div className="bg-dark-bg rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Daily Avg</p>
          <p className="text-xl font-semibold text-green-400">
            {(usage?.estimateDailyCost || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">credits</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="day" stroke="#666" style={{ fontSize: 12 }} />
            <YAxis stroke="#666" style={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <Bar dataKey="credits" fill="#14F195" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
