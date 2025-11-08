import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await authApi.getCurrentUser();
      return response.data;
    },
    enabled: false, // Disabled - user comes from login response
    retry: false,
  });

  const loginWithPhantom = useMutation({
    mutationFn: authApi.loginWithPhantom,
    onSuccess: (data) => {
      console.log('✅ Login successful!', data);
      console.log('💾 Saving token to localStorage...');
      setAuth(data.data.user, data.data.token);
      console.log('✅ Auth state updated, navigating to dashboard...');
      toast.success('Logged in successfully');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('❌ Login failed:', error);
      console.error('❌ Response:', error.response?.data);
      toast.error(error.response?.data?.error || error.message || 'Login failed');
    },
  });

  const loginWithTelegram = useMutation({
    mutationFn: authApi.loginWithTelegram,
    onSuccess: (data) => {
      setAuth(data.data.user, data.data.token);
      toast.success('Logged in successfully');
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed');
    },
  });

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAuth();
      toast.success('Logged out successfully');
      navigate('/login');
    },
  });

  return {
    user: user || currentUser,
    isAuthenticated,
    isLoading,
    loginWithPhantom: loginWithPhantom.mutate,
    loginWithTelegram: loginWithTelegram.mutate,
    logout: logout.mutate,
    isLoggingIn: loginWithPhantom.isPending || loginWithTelegram.isPending,
  };
}
