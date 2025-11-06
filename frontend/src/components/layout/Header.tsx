import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-dark-card border-b border-dark-border fixed top-0 right-0 left-64 z-10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-200">
          Welcome back
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-dark-bg rounded-lg">
          <User size={20} className="text-gray-400" />
          <div>
            <p className="text-sm font-medium">
              {user?.walletAddress
                ? `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}`
                : 'User'}
            </p>
            <p className="text-xs text-gray-500">
              {user?.credits?.toLocaleString() || 0} credits
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
