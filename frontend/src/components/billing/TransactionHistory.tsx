import { useCredits } from '@/hooks/useCredits';
import { ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export function TransactionHistory() {
  const { transactions, isLoading } = useCredits();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400 bg-green-400/10';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
        <div className="animate-pulse">
          <div className="h-4 bg-dark-bg rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-dark-bg rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const txList = transactions?.data?.transactions || [];

  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <h2 className="text-xl font-semibold mb-6">Transaction History</h2>

      {txList.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No transactions yet</p>
          <p className="text-sm mt-1">Your prepayment history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {txList.map((tx: any) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-solana-purple/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div>{getStatusIcon(tx.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">${tx.amountUsd}</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded', getStatusColor(tx.status))}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {tx.creditsIssued.toLocaleString()} credits
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {tx.txHash && (
                <a
                  href={`https://explorer.solana.com/tx/${tx.txHash}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-solana-purple hover:underline"
                >
                  View
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
