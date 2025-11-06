import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreditsBalance } from '@/components/billing/CreditsBalance';
import { PrepaymentModal } from '@/components/billing/PrepaymentModal';
import { UsageChart } from '@/components/billing/UsageChart';
import { TransactionHistory } from '@/components/billing/TransactionHistory';
import { useCredits } from '@/hooks/useCredits';

export function Billing() {
  const [showPrepaymentModal, setShowPrepaymentModal] = useState(false);
  const { refetchBalance } = useCredits();

  const handlePrepaymentSuccess = () => {
    refetchBalance();
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Credits</h1>
          <p className="text-gray-400">
            Manage your credits and view usage statistics
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <CreditsBalance onAddCredits={() => setShowPrepaymentModal(true)} />
          </div>
          <div className="lg:col-span-2">
            <UsageChart />
          </div>
        </div>

        <TransactionHistory />

        <PrepaymentModal
          isOpen={showPrepaymentModal}
          onClose={() => setShowPrepaymentModal(false)}
          onSuccess={handlePrepaymentSuccess}
        />
      </div>
    </MainLayout>
  );
}
