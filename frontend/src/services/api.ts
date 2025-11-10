import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '@/types';

// Use empty string to make requests relative to current domain
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    // Only redirect on 401 if NOT on login page and NOT during login request
    if (error.response?.status === 401 && 
        !window.location.pathname.includes('/login') &&
        !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  loginWithPhantom: async (payload: {
    walletAddress: string;
    signature: string;
    message: string;
  }) => {
    const response = await api.post('/auth/phantom/login', payload);
    return response.data;
  },

  loginWithTelegram: async (payload: {
    telegramUserId: string | number;
    username?: string;
  }) => {
    const response = await api.post('/auth/telegram/login', payload);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('authToken');
    return response.data;
  },
};

export const creditsApi = {
  getBalance: async () => {
    const response = await api.get('/api/credits/balance');
    return response.data;
  },

  getUsage: async () => {
    const response = await api.get('/api/credits/usage');
    return response.data;
  },

  getTransactions: async (page: number = 1, limit: number = 20) => {
    const response = await api.get('/api/credits/transactions', {
      params: { page, limit },
    });
    return response.data;
  },
};
