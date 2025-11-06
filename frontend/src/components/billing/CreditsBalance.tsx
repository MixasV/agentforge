import { useCredits } from '@/hooks/useCredits';
import { Wallet, TrendingUp, DollarSign, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CreditsBalanceProps {
  onAddCredits: () => void;
}

export function CreditsBalance({ onAddCredits }: CreditsBalanceProps) {
  const { balance, isLoading } = useCredits();

  if (isLoading) {
    return (
      <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
        <div className="animate-pulse">
          <div className="h-4 bg-dark-bg rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-dark-bg rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-dark-bg rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  const creditsBalance = balance?.balance || 0;
  const usdValue = (creditsBalance * 0.001).toFixed(2);
  const isLowBalance = creditsBalance < 500;

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Credits Balance</h2>
        <div className="p-3 bg-solana-green/10 rounded-lg">
          <Wallet size={24} className="text-solana-green" />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold text-solana-green">
            {creditsBalance.toLocaleString()}
          </span>
          <span className="text-gray-400">credits</span>
        </div>
        <p className="text-sm text-gray-500">≈ ${usdValue} USD</p>
      </div>

      {isLowBalance && (
        <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <p className="text-sm text-orange-400">
            ⚠️ Low balance warning. Consider adding more credits.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-dark-bg rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400">Total Paid</span>
          </div>
          <p className="text-lg font-semibold">${balance?.totalPaid || 0}</p>
        </div>

        <div className="bg-dark-bg rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400">Last Top-up</span>
          </div>
          <p className="text-sm font-semibold">
            {balance?.lastToppedUp
              ? formatDistanceToNow(new Date(balance.lastToppedUp), { addSuffix: true })
              : 'Never'}
          </p>
        </div>
      </div>

      <button
        onClick={onAddCredits}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
      >
        <Plus size={20} />
        Add Credits
      </button>
    </div>
  );
}
