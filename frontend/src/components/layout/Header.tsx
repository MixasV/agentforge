import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { LogOut, User, Wallet } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const { balance } = useCredits();

  const displayName = user?.email 
    ? user.email 
    : user?.walletAddress 
    ? `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}`
    : 'User';

  return (
    <header className="h-16 bg-dark-card border-b border-dark-border fixed top-0 right-0 left-64 z-10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-200">
          Welcome back
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-dark-bg rounded-lg">
          {user?.walletAddress ? (
            <Wallet size={20} className="text-solana-green" />
          ) : (
            <User size={20} className="text-gray-400" />
          )}
          <div>
            <p className="text-sm font-medium" title={user?.walletAddress || user?.email || ''}>
              {displayName}
            </p>
            <p className="text-xs text-solana-green font-semibold">
              {balance?.balance?.toLocaleString() || 0} credits
            </p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
