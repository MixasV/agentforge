import { useQuery } from '@tanstack/react-query';
import { creditsApi } from '@/services/api';

export function useCredits() {
  const {
    data: balance,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: async () => {
      const response = await creditsApi.getBalance();
      return response.data;
    },
    refetchInterval: 30000,
  });

  const {
    data: usage,
    isLoading: isLoadingUsage,
  } = useQuery({
    queryKey: ['credits', 'usage'],
    queryFn: async () => {
      const response = await creditsApi.getUsage();
      return response.data;
    },
    refetchInterval: 60000,
  });

  const {
    data: transactions,
    isLoading: isLoadingTransactions,
  } = useQuery({
    queryKey: ['credits', 'transactions'],
    queryFn: async () => {
      const response = await creditsApi.getTransactions(1, 20);
      return response.data;
    },
  });

  return {
    balance,
    usage,
    transactions,
    isLoading: isLoadingBalance || isLoadingUsage || isLoadingTransactions,
    refetchBalance,
  };
}
