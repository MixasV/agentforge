import { Link, useLocation } from 'react-router-dom';
import { Home, Workflow, Blocks, DollarSign, Settings } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import clsx from 'clsx';

export function Sidebar() {
  const location = useLocation();
  const { balance } = useCredits();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/workflows', label: 'Workflows', icon: Workflow },
    { path: '/blocks', label: 'Blocks', icon: Blocks },
    { path: '/billing', label: 'Billing', icon: DollarSign },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-dark-card border-r border-dark-border h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-dark-border">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
          AgentForge
        </h1>
      </div>

      <nav className="flex-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors',
                isActive
                  ? 'bg-solana-purple/10 text-solana-purple'
                  : 'text-gray-400 hover:bg-dark-border hover:text-white'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-border">
        <div className="bg-dark-bg rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Credits Balance</p>
          <p className="text-2xl font-bold text-solana-green">
            {balance?.balance?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ≈ ${((balance?.balance || 0) * 0.001).toFixed(2)}
          </p>
        </div>
      </div>
    </aside>
  );
}
