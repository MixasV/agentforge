import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { Activity, Zap, TrendingUp, Workflow } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const { balance, usage } = useCredits();

  const stats = [
    {
      label: 'Credits Balance',
      value: balance?.balance?.toLocaleString() || '0',
      subValue: `≈ $${((balance?.balance || 0) * 0.001).toFixed(2)}`,
      icon: Zap,
      color: 'text-solana-green',
      bgColor: 'bg-solana-green/10',
    },
    {
      label: 'Today Usage',
      value: usage?.todayUsage?.toLocaleString() || '0',
      subValue: 'credits',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Week Usage',
      value: usage?.weekUsage?.toLocaleString() || '0',
      subValue: 'credits',
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      label: 'Active Workflows',
      value: '0',
      subValue: 'workflows',
      icon: Workflow,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
    },
  ];

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{user?.walletAddress ? `, ${user.walletAddress.slice(0, 6)}...` : ''}!
          </h1>
          <p className="text-gray-400">
            Here's what's happening with your agents today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-solana-purple/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon size={24} className={stat.color} />
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subValue}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
            <h2 className="text-xl font-semibold mb-4">Recent Workflows</h2>
            <div className="text-center py-12 text-gray-500">
              <Workflow size={48} className="mx-auto mb-4 opacity-50" />
              <p>No workflows yet</p>
              <p className="text-sm">Create your first workflow to get started</p>
            </div>
          </div>

          <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/workflows'}
                className="w-full bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Create New Workflow
              </button>
              <button
                onClick={() => window.location.href = '/workflows'}
                className="w-full bg-dark-bg text-white font-semibold py-3 rounded-lg border border-dark-border hover:border-solana-purple transition-colors"
              >
                Browse Workflows
              </button>
              <button
                onClick={() => window.location.href = '/billing'}
                className="w-full bg-dark-bg text-white font-semibold py-3 rounded-lg border border-dark-border hover:border-solana-purple transition-colors"
              >
                Add Credits
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
