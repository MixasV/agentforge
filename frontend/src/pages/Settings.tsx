import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { User, Wallet, Key, Bell, Shield, Trash2, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export function Settings() {
  const { user, logout } = useAuth();
  const { balance } = useCredits();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteAccount = () => {
    toast.error('Account deletion not implemented yet');
    setShowDeleteModal(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        <div className="max-w-4xl space-y-6">
          {/* Profile Section */}
          <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-solana-purple/10 rounded-lg">
                <User size={24} className="text-solana-purple" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Profile</h2>
                <p className="text-sm text-gray-400">Your account information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">User ID</label>
                <div className="px-4 py-3 bg-dark-bg rounded-lg border border-dark-border">
                  <code className="text-sm">{user?.id}</code>
                </div>
              </div>

              {user?.walletAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Wallet Address
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-dark-bg rounded-lg border border-dark-border">
                      <code className="text-sm">{user.walletAddress}</code>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.walletAddress!);
                        toast.success('Copied to clipboard');
                      }}
                      className="px-4 py-3 bg-solana-purple/10 text-solana-purple rounded-lg hover:bg-solana-purple/20 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Member Since
                </label>
                <div className="px-4 py-3 bg-dark-bg rounded-lg border border-dark-border">
                  <span className="text-sm">
                    {user?.createdAt
                      ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Credits Balance
                </label>
                <div className="px-4 py-3 bg-dark-bg rounded-lg border border-dark-border">
                  <span className="text-lg font-semibold text-solana-green">
                    {balance?.balance?.toLocaleString() || 0} credits
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    (≈ ${((balance?.balance || 0) * 0.001).toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-400/10 rounded-lg">
                <Shield size={24} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Security</h2>
                <p className="text-sm text-gray-400">Manage your security settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div className="flex items-center gap-3">
                  <Key size={20} className="text-gray-400" />
                  <div>
                    <p className="font-medium">Session Keys</p>
                    <p className="text-sm text-gray-400">Manage your Solana session keys</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-dark-card border border-dark-border text-white rounded-lg hover:border-solana-purple transition-colors">
                  Manage
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div className="flex items-center gap-3">
                  <Wallet size={20} className="text-gray-400" />
                  <div>
                    <p className="font-medium">Connected Wallet</p>
                    <p className="text-sm text-gray-400">
                      {user?.walletAddress
                        ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-8)}`
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-dark-card border border-dark-border text-white rounded-lg hover:border-solana-purple transition-colors">
                  Change
                </button>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-yellow-400/10 rounded-lg">
                <Bell size={24} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Notifications</h2>
                <p className="text-sm text-gray-400">Configure your notification preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div>
                  <p className="font-medium">Workflow Execution Alerts</p>
                  <p className="text-sm text-gray-400">Get notified when workflows complete</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-solana-purple"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div>
                  <p className="font-medium">Low Credits Warning</p>
                  <p className="text-sm text-gray-400">Alert when balance is low</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-solana-purple"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
                <div>
                  <p className="font-medium">Transaction Confirmations</p>
                  <p className="text-sm text-gray-400">Notify on x402 transactions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-solana-purple"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-dark-card rounded-xl p-6 border border-red-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>
                <p className="text-sm text-gray-400">Irreversible actions</p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-bg border border-dark-border text-white rounded-lg hover:border-yellow-500 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={18} />
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-card rounded-xl p-6 w-full max-w-md border border-red-500/20">
              <h2 className="text-xl font-semibold mb-4 text-red-400">Delete Account?</h2>
              <p className="text-gray-400 mb-6">
                This action cannot be undone. All your workflows, credits, and data will be
                permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border text-white rounded-lg hover:border-solana-purple transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
